// screens/PublishScreen.tsx: put saved changes on the site in two steps, preview then live
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, PublishStatus } from '../types';
import { getPublishStatus, syncPreview, syncLive, errorMessage } from '../api';
import { useTheme } from '../theme';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Publish'>;

const LIVE_SITE_URL = 'https://hailey-art.vercel.app';
const POLL_MS = 5000;

type Tone = 'muted' | 'progress' | 'ready' | 'warning' | 'danger';

function previewMessage(status: PublishStatus): { tone: Tone; text: string } {
  const { preview } = status;
  switch (preview.state) {
    case 'syncing':
      return { tone: 'progress', text: 'Gathering your latest changes… (about a minute)' };
    case 'building':
      return { tone: 'progress', text: 'Building the preview site… (1–2 minutes)' };
    case 'ready':
      return {
        tone: 'ready',
        text:
          preview.changedFiles === 0
            ? 'Preview ready. It looks the same as the live site.'
            : 'Preview ready. Open it and check everything looks right.',
      };
    case 'outdated':
      return { tone: 'warning', text: 'The live site changed after this preview was made. Sync Preview again.' };
    case 'failed':
      return { tone: 'danger', text: "The preview didn't finish. Try Sync Preview again." };
    default:
      return { tone: 'muted', text: 'Make a preview to see your saved changes before they go live.' };
  }
}

function liveMessage(status: PublishStatus): { tone: Tone; text: string } {
  if (status.live.state === 'updating') return { tone: 'progress', text: 'Updating the live site… (1–2 minutes)' };
  if (status.live.state === 'failed') return { tone: 'danger', text: "The last live update didn't finish." };
  if (status.canPublish) return { tone: 'muted', text: 'Publishing puts exactly what is in the preview on the live site.' };
  return { tone: 'muted', text: 'Available once a preview is ready.' };
}

export default function PublishScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'preview' | 'live' | null>(null);
  const [confirmLive, setConfirmLive] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getPublishStatus());
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not check the publishing status.'));
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Keep checking while something is in progress
  const inProgress =
    status?.preview.state === 'syncing' || status?.preview.state === 'building' || status?.live.state === 'updating';
  useEffect(() => {
    if (!inProgress) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [inProgress, refresh]);

  const run = async (action: 'preview' | 'live') => {
    setBusy(action);
    setError('');
    try {
      setStatus(await (action === 'preview' ? syncPreview() : syncLive()));
    } catch (e) {
      setError(errorMessage(e, action === 'preview' ? 'Could not start the preview.' : 'Could not publish.'));
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const toneColor = (tone: Tone) =>
    ({ muted: colors.muted, progress: colors.text, ready: colors.text, warning: colors.warning, danger: colors.danger })[tone];

  const preview = status && previewMessage(status);
  const live = status && liveMessage(status);
  const previewWorking = status?.preview.state === 'syncing' || status?.preview.state === 'building';
  const hasPreview = status?.preview.state !== 'none';

  return (
    <Screen title="Publish" onBack={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ color: colors.muted }}>
          Changes you save here aren't on the website until you publish them. Make a preview first, check it, then
          send it live.
        </Text>

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        {!status ? (
          error ? null : <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.step, { color: colors.text }]}>1. Preview</Text>
              <View style={styles.statusRow}>
                {preview!.tone === 'progress' ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                <Text style={[styles.statusText, { color: toneColor(preview!.tone) }]}>{preview!.text}</Text>
              </View>
              {status.preview.state === 'ready' && status.preview.syncedAt ? (
                <Text style={{ color: colors.muted }}>
                  Made {new Date(status.preview.syncedAt).toLocaleString()}
                </Text>
              ) : null}
              {status.preview.editedSinceSync ? (
                <Text style={{ color: colors.warning }}>
                  You've saved changes since this preview was made. Sync Preview again to include them.
                </Text>
              ) : null}
              {status.preview.state === 'ready' && status.preview.url ? (
                <Button variant="secondary" title="Open Preview ↗" onPress={() => Linking.openURL(status.preview.url!)} />
              ) : null}
              <Button
                title={busy === 'preview' ? 'Starting…' : hasPreview && !previewWorking ? 'Sync Preview Again' : 'Sync Preview'}
                onPress={() => run('preview')}
                disabled={!!busy || previewWorking}
                style={styles.big}
              />
            </View>

            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.step, { color: colors.text }]}>2. Live</Text>
              <View style={styles.statusRow}>
                {live!.tone === 'progress' ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                <Text style={[styles.statusText, { color: toneColor(live!.tone) }]}>{live!.text}</Text>
              </View>
              <Button variant="secondary" title="Open Live Site ↗" onPress={() => Linking.openURL(LIVE_SITE_URL)} />
              <Button
                title={busy === 'live' ? 'Publishing…' : 'Sync Live'}
                onPress={() => setConfirmLive(true)}
                disabled={!!busy || !status.canPublish}
                style={styles.big}
              />
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={confirmLive}
        title="Publish to the live site?"
        message={
          status?.preview.editedSinceSync
            ? "The live site will show exactly what's in the preview. Changes saved after the preview was made won't be included."
            : "The live site will show exactly what's in the preview."
        }
        onConfirm={() => { setConfirmLive(false); run('live'); }}
        onCancel={() => setConfirmLive(false)}
        confirmText="Publish"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  step: { fontSize: 18, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { flex: 1, fontSize: 16 },
  big: { paddingVertical: 16 },
});
