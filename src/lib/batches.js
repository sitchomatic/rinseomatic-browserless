export function chunkArray(items = [], size = 500) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function runInBatches(items = [], batchSize = 500, handler) {
  for (const chunk of chunkArray(items, batchSize)) {
    await handler(chunk);
  }
}