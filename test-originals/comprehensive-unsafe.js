// A complex script that uses multiple non-baseline features together.

async function processAndCloneData() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 800);

  console.log('Racing two API endpoints...');

  try {
    const firstSuccessfulResponse = await Promise.any([
      fetch('/api/fast-endpoint', { signal: controller.signal }),
      fetch('/api/slow-endpoint', { signal: controller.signal })
    ]);

    clearTimeout(timeoutId); 
    
    const originalData = await firstSuccessfulResponse.json();
    console.log('Received original data:', originalData);

    const clonedData = structuredClone(originalData);
    clonedData.meta.processed = true;
    
    console.log('Successfully cloned and modified data:', clonedData);
    return clonedData;

  } catch (error) {
    if (error instanceof AggregateError) {
      console.error('Both API calls failed:', error.errors);
    } else {
      console.error('An error occurred:', error.name);
    }
  }
}

processAndCloneData();
