/**
 * Video Chain Utilities
 * Professional frame extraction & chaining logic
 */

/**
 * Extract last frame from video URL (client-side)
 * Returns base64 data URL of last frame
 */
export async function extractLastFrame(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      // Seek to last frame (duration - 0.1s for safety)
      video.currentTime = Math.max(0, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob for upload
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Frame extraction failed'));
              return;
            }

            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve(dataUrl);
          },
          'image/jpeg',
          0.95
        );
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => {
      reject(new Error('Video load failed'));
    };

    video.src = videoUrl;
  });
}

/**
 * Upload frame to Vercel Blob
 */
export async function uploadFrameToBlob(
  dataUrl: string,
  filename: string
): Promise<string> {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  // Upload to our API
  const formData = new FormData();
  formData.append('file', blob, filename);

  const uploadResponse = await fetch('/api/media/upload-frame', {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error('Frame upload failed');
  }

  const data = await uploadResponse.json();
  return data.url;
}

/**
 * Chain State
 */
export interface ChainState {
  chainId: string;
  position: number; // 1-4
  previousVideoId?: string;
  frameUrl?: string;
}

/**
 * Generate Chain ID
 */
export function generateChainId(): string {
  return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
