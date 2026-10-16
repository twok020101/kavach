import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Storage } from '@google-cloud/storage';
import { env } from '../env';
import { repoRoot } from '../paths';

/**
 * Stores uploaded files (estimate photos, letters) and generated PDFs.
 * Uses Cloud Storage when GCS_BUCKET is set, otherwise `.data/blobs` on local disk.
 */
export interface BlobStore {
  put(path: string, data: Buffer, contentType: string): Promise<void>;
  get(path: string): Promise<Buffer>;
}

class LocalBlobStore implements BlobStore {
  private readonly root = resolve(repoRoot, '.data/blobs');

  async put(path: string, data: Buffer) {
    const file = resolve(this.root, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
  }

  async get(path: string) {
    return readFile(resolve(this.root, path));
  }
}

class GcsBlobStore implements BlobStore {
  private readonly bucket = new Storage().bucket(env.GCS_BUCKET!);

  async put(path: string, data: Buffer, contentType: string) {
    await this.bucket.file(path).save(data, { contentType, resumable: false });
  }

  async get(path: string) {
    const [data] = await this.bucket.file(path).download();
    return data;
  }
}

export const blobs: BlobStore = env.GCS_BUCKET ? new GcsBlobStore() : new LocalBlobStore();
