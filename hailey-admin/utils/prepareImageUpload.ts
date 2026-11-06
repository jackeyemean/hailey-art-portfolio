// utils/prepareImageUpload.ts
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';

// The API rejects request bodies above roughly 4 MB (Vercel's function payload limit)
const MAX_BASE64_LENGTH = 4_000_000;

// The API stores images at 1200px or smaller, so these sizes lose no final quality
const ATTEMPTS = [
  { maxSide: 1600, compress: 0.85 },
  { maxSide: 1200, compress: 0.8 },
  { maxSide: 1200, compress: 0.6 },
];

export async function prepareImageUpload(asset: ImagePickerAsset, fallbackName: string) {
  const filename = asset.fileName || asset.uri.split('/').pop() || fallbackName;

  for (const { maxSide, compress } of ATTEMPTS) {
    const context = ImageManipulator.manipulate(asset.uri);
    if (asset.width > maxSide || asset.height > maxSide) {
      context.resize(asset.width >= asset.height ? { width: maxSide } : { height: maxSide });
    }
    const rendered = await context.renderAsync();
    const { base64 } = await rendered.saveAsync({ base64: true, compress, format: SaveFormat.JPEG });

    if (base64 && base64.length <= MAX_BASE64_LENGTH) {
      return { image: base64, filename };
    }
  }

  throw new Error('Image is too large to upload');
}
