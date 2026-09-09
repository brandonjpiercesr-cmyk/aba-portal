const status = document.querySelector('#entry-status');
let token = location.hash.startsWith('#') ? location.hash.slice(1) : '';
history.replaceState(null, '', '/enter');

try {
  token = decodeURIComponent(token);
  if (!token) throw new Error('invalid');
  const response = await fetch('/session', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { authorization: `Bearer ${token}` },
  });
  token = '';
  if (!response.ok) throw new Error('refused');
  location.replace('/mail');
} catch {
  token = '';
  status.textContent = 'This private entry is unavailable.';
}
