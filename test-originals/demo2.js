const getUserProfile = async (id) => {
  const response = await fetch(`https://api.example.com/users/${id}`);
  const user = await response.json();
  const street = user?.address?.street ?? 'No street provided';
  return `User ${user.name} lives on ${street}.`;
};

getUserProfile(1);
