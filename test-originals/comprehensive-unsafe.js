// A complex script that uses multiple non-baseline features together.

async function processAndCloneData() {
  // 1. AbortController is used to set a timeout for our API calls.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 800);

  console.log('Racing two API endpoints...');

  try {
    // 2. Promise.any races two fetch requests.
    const firstSuccessfulResponse = await Promise.any([
      fetch('/api/fast-endpoint', { signal: controller.signal }),
      fetch('/api/slow-endpoint', { signal: controller.signal })
    ]);

    clearTimeout(timeoutId); // Clear the timeout since a promise succeeded.
    
    const originalData = await firstSuccessfulResponse.json();
    console.log('Received original data:', originalData);

    // 3. structuredClone is used to create a true deep copy of the complex data.
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