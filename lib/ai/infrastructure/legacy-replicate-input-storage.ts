import { put } from '@vercel/blob';
import type { LegacyReplicateUploadFile } from '@/lib/ai/contracts/legacy-replicate-job';

const sanitizeFilename = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');

export const uploadFaceSwapInputs = async (input: {
  userId: string;
  face: LegacyReplicateUploadFile;
  video: LegacyReplicateUploadFile;
}) => {
  const faceBuffer = Buffer.from(await input.face.arrayBuffer());
  const faceFilename = `faceswap/${input.userId}/faces/${Date.now()}-${sanitizeFilename(input.face.name)}`;
  const faceBlob = await put(faceFilename, faceBuffer, {
    access: 'public',
    contentType: input.face.type,
  });

  const videoBuffer = Buffer.from(await input.video.arrayBuffer());
  const videoFilename = `faceswap/${input.userId}/videos/${Date.now()}-${sanitizeFilename(input.video.name)}`;
  const videoBlob = await put(videoFilename, videoBuffer, {
    access: 'public',
    contentType: input.video.type,
  });

  return {
    faceUrl: faceBlob.url,
    videoUrl: videoBlob.url,
  };
};

export const uploadMotionTransferInputs = async (input: {
  userId: string;
  characterImage: LegacyReplicateUploadFile;
  drivingVideo: LegacyReplicateUploadFile;
}) => {
  const videoBuffer = Buffer.from(await input.drivingVideo.arrayBuffer());
  const videoFilename = `motion-transfer/${input.userId}/videos/${Date.now()}-${sanitizeFilename(input.drivingVideo.name)}`;
  const videoBlob = await put(videoFilename, videoBuffer, {
    access: 'public',
    contentType: input.drivingVideo.type,
  });

  const imageBuffer = Buffer.from(await input.characterImage.arrayBuffer());
  const imageFilename = `motion-transfer/${input.userId}/characters/${Date.now()}-${sanitizeFilename(input.characterImage.name)}`;
  const imageBlob = await put(imageFilename, imageBuffer, {
    access: 'public',
    contentType: input.characterImage.type,
  });

  return {
    drivingVideoUrl: videoBlob.url,
    characterImageUrl: imageBlob.url,
  };
};
