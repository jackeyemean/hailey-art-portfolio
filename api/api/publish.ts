// Vercel serverless function: publishing the site in two steps.
//
//   Sync Preview  starts the "Sync preview" GitHub workflow, which runs the sync script and
//                 pushes the result to the `preview` branch; Vercel builds it as a preview site.
//   Sync Live     moves `main` to the preview's commit (fast-forward only), so the live site
//                 becomes exactly what was previewed. Only allowed once the preview has built.
import { supabase } from '../lib/supabase';
import { route, HttpError } from '../lib/http';
import {
  github,
  LIVE_BRANCH,
  PREVIEW_BRANCH,
  SYNC_WORKFLOW,
  SITE_STATUS_CONTEXT,
  SITE_PREVIEW_ENVIRONMENT,
} from '../lib/github';

type PreviewState = 'none' | 'syncing' | 'building' | 'ready' | 'outdated' | 'failed';
type LiveState = 'live' | 'updating' | 'failed';

export interface PublishStatus {
  preview: {
    state: PreviewState;
    url: string | null; // the preview site, once built
    syncedAt: string | null; // when the preview's data was read from the database
    changedFiles: number; // files that differ from the live site
    editedSinceSync: boolean; // admin changes saved after the preview was made
  };
  live: { state: LiveState };
  canPublish: boolean;
}

// State of the public site's Vercel build for a commit
async function siteBuildState(ref: string): Promise<'pending' | 'success' | 'failure' | null> {
  const { data } = await github(`/commits/${ref}/statuses?per_page=100`);
  // Newest first; the first entry for our context is the current one
  const status = (data || []).find((s: any) => s.context === SITE_STATUS_CONTEXT);
  if (!status) return null;
  return status.state === 'success' ? 'success' : status.state === 'pending' ? 'pending' : 'failure';
}

async function previewUrl(sha: string): Promise<string | null> {
  const { data: deployments } = await github(
    `/deployments?sha=${sha}&environment=${encodeURIComponent(SITE_PREVIEW_ENVIRONMENT)}&per_page=1`,
  );
  if (!deployments?.length) return null;
  const { data: statuses } = await github(`/deployments/${deployments[0].id}/statuses?per_page=1`);
  return statuses?.[0]?.environment_url || null;
}

async function latestSyncRun() {
  const { data } = await github(`/actions/workflows/${SYNC_WORKFLOW}/runs?per_page=1`);
  return data?.workflow_runs?.[0] ?? null;
}

async function lastEditAt(): Promise<string | null> {
  const { data } = await supabase.from('SiteState').select('value').eq('key', 'lastEditAt').maybeSingle();
  return data?.value ?? null;
}

async function getStatus(): Promise<PublishStatus & { previewSha: string | null }> {
  const [run, compare, liveBuild, editedAt] = await Promise.all([
    latestSyncRun(),
    github(`/compare/${LIVE_BRANCH}...${PREVIEW_BRANCH}`),
    siteBuildState(LIVE_BRANCH),
    lastEditAt(),
  ]);

  const live = { state: (liveBuild === 'pending' ? 'updating' : liveBuild === 'failure' ? 'failed' : 'live') as LiveState };
  const preview: PublishStatus['preview'] = {
    state: 'none',
    url: null,
    syncedAt: run?.conclusion === 'success' ? run.run_started_at : null,
    changedFiles: 0,
    editedSinceSync: false,
  };
  let previewSha: string | null = null;

  if (run && run.status !== 'completed') {
    preview.state = 'syncing';
  } else if (run && run.conclusion !== 'success') {
    preview.state = 'failed';
  } else if (compare.status === 200 && compare.data.status === 'ahead') {
    previewSha = compare.data.commits[compare.data.commits.length - 1].sha as string;
    preview.changedFiles = (compare.data.files || []).length;
    const [build, url] = await Promise.all([siteBuildState(previewSha), previewUrl(previewSha)]);
    preview.state = build === 'success' ? 'ready' : build === 'failure' ? 'failed' : 'building';
    preview.url = build === 'success' ? url : null;
    preview.editedSinceSync = !!(
      editedAt &&
      preview.syncedAt &&
      new Date(editedAt).getTime() > new Date(preview.syncedAt).getTime()
    );
  } else if (compare.status === 200 && compare.data.status === 'diverged') {
    // The live site got other commits after this preview was made
    preview.state = 'outdated';
  }
  // Otherwise ('identical'/'behind', or no preview branch yet) everything previewed is live

  return { preview, live, canPublish: preview.state === 'ready', previewSha };
}

export default route(
  {
    GET: async () => {
      const { previewSha, ...status } = await getStatus();
      return status;
    },

    POST: async (req, res, body) => {
      if (body.action === 'preview') {
        const run = await latestSyncRun();
        if (run && run.status !== 'completed') throw new HttpError(409, 'A preview is already being made.');

        const startedAt = Date.now();
        const { status } = await github(`/actions/workflows/${SYNC_WORKFLOW}/dispatches`, {
          method: 'POST',
          body: { ref: LIVE_BRANCH },
        });
        if (status !== 204) throw new Error(`GitHub did not start the sync (status ${status})`);

        // GitHub takes a few seconds to list the new run; wait so the status reflects it
        for (let i = 0; i < 8; i++) {
          const latest = await latestSyncRun();
          if (latest && new Date(latest.created_at).getTime() >= startedAt - 5000) break;
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else if (body.action === 'live') {
        const { canPublish, previewSha } = await getStatus();
        if (!canPublish || !previewSha) throw new HttpError(409, 'The preview is not ready to publish.');

        const { status } = await github(`/git/refs/heads/${LIVE_BRANCH}`, {
          method: 'PATCH',
          body: { sha: previewSha, force: false },
        });
        if (status === 422) {
          throw new HttpError(409, 'The live site changed after this preview was made. Sync Preview again.');
        }
        if (status !== 200) throw new Error(`GitHub did not update the live site (status ${status})`);
      } else {
        throw new HttpError(400, 'action must be "preview" or "live"');
      }

      const { previewSha, ...status } = await getStatus();
      return status;
    },
  },
  { recordsEdits: false },
);
