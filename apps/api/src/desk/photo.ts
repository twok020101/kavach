import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { EstimateImage } from '../agents/estimate-reader';

/** Longest side the estimate reader needs; phone photos are 3,000–4,000 px and 3–8 MB. */
const MAX_SIDE = 2048;
/** Photos under this size and within MAX_SIDE go to the model as they are. */
const PASS_THROUGH_BYTES = 1_500_000;
const RASTER = ['image/jpeg', 'image/png', 'image/webp'];

const unreadable = (message: string) => Object.assign(new Error(message), { statusCode: 415 });

/**
 * Makes an uploaded estimate photo readable by the model: HEIC/HEIF (iPhone default) is refused
 * with a message the family can act on, raster photos are decoded (so a damaged file fails here,
 * not deep inside the model call) and large ones are scaled down to a JPEG the reader can take
 * quickly. PDFs pass through untouched.
 */
export async function prepareEstimatePhoto(img: EstimateImage): Promise<EstimateImage> {
  if (img.mimeType === 'application/pdf') return img;
  if (/hei[cf]/i.test(img.mimeType)) {
    throw unreadable(
      "HEIC photos can't be read here. On an iPhone, set Camera → Formats to 'Most Compatible', or send a screenshot of the photo.",
    );
  }
  if (!RASTER.includes(img.mimeType)) {
    throw unreadable(`Unsupported file type ${img.mimeType}: send a photo (JPEG, PNG) or a PDF.`);
  }

  let image;
  try {
    image = await loadImage(img.data);
  } catch {
    throw unreadable('That file is not a readable photo. Please take the photo again.');
  }
  const longest = Math.max(image.width, image.height);
  if (longest <= MAX_SIDE && img.data.byteLength <= PASS_THROUGH_BYTES) return img;

  const scale = Math.min(1, MAX_SIDE / longest);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, width, height);
  g.drawImage(image, 0, 0, width, height);
  return { data: canvas.toBuffer('image/jpeg', 88), mimeType: 'image/jpeg' };
}
