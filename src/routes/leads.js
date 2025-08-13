import { useState } from 'react';

export default function App() {
  const [form, setForm] = useState({ name: '', phone: '', service: 'crypto', note: '' });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setResult('Lead submitted!');
        setForm({ name: '', phone: '', service: 'crypto', note: '' });
      } else {
        setResult(data.error || 'Error submitting lead');
      }
    } catch {
      setResult('Network error');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>DevOps Real App</h1>
      <h2>Create a Lead</h2>
      <form onSubmit={handleSubmit}>
        <label>Name</label>
        <input name="name" value={form.name} onChange={handleChange} required />
        <label>Phone/WhatsApp</label>
        <input name="phone" value={form.phone} onChange={handleChange} required />
        <label>Service</label>
        <select name="service" value={form.service} onChange={handleChange} required>
          <option value="crypto">Crypto</option>
          <option value="giftcard">Giftcard</option>
          <option value="webdev">Web Dev</option>
          <option value="seo">SEO</option>
        </select>
        <label>Note</label>
        <textarea name="note" value={form.note} onChange={handleChange} rows={3} />
        <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Submitting...' : 'Submit Lead'}
        </button>
      </form>
      <div style={{ marginTop: 16 }}>{result}</div>
    </div>
  );
}
