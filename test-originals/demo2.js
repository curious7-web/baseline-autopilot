// modern-but-safe.js
// Your tool should NOT find any issues in this file.

const getUserProfile = async (id) => {
  const response = await fetch(`https://api.example.com/users/${id}`);
  const user = await response.json();
  
  // These are modern but baseline-supported features
  const street = user?.address?.street ?? 'No street provided';
  return `User ${user.name} lives on ${street}.`;
};

getUserProfile(1);