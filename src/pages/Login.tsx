import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-300 to-cyan-200">
      <div className="w-full max-w-md px-6 py-12">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-600 mb-12 text-center">
            Login
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label htmlFor="email" className="block text-gray-700 font-semibold mb-3 text-lg">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800 text-lg transition-colors"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-gray-700 font-semibold mb-3 text-lg">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800 text-lg transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-5 bg-blue-600 text-white text-xl font-semibold rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-6 text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
