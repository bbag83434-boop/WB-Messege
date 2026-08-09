import fetch from 'node-fetch';

async function testProfile() {
  const baseUrl = 'http://localhost:3001/api';
  const token = 'YOUR_TOKEN_HERE'; // Replace with a valid token from a registration

  console.log('\n--- Testing Update Profile ---');
  const res = await fetch(`${baseUrl}/users/profile`, {
    method: 'PUT',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'Test User Updated', about: 'Hello, this is my about section!' })
  });
  const data = await res.json();
  console.log('Update Profile Response:', data);
}

// I can't easily get a token here without registering a new user every time.
// The current test_auth.js already registers a user. I will just run a manual check by modifying the test_auth.js.
