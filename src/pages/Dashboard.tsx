import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'done';
  created_at: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'pending' | 'in-progress' | 'done'>('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTasks(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .insert([
          {
            user_id: user.id,
            title: newTask.trim(),
            priority,
            status,
          }
        ]);

      if (error) throw error;

      setNewTask('');
      setPriority('medium');
      setStatus('pending');
      await fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      await fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      await fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'pending':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-300 to-cyan-200 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-600 mb-12 text-center">
            Your Tasks
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleAddTask} className="mb-12 space-y-4">
            <div>
              <label htmlFor="newTask" className="block text-gray-700 font-semibold mb-3 text-lg">
                New Task
              </label>
              <input
                id="newTask"
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800 text-lg transition-colors"
                placeholder="Enter a new task"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-gray-700 font-semibold mb-3 text-lg">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800 text-lg transition-colors"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-gray-700 font-semibold mb-3 text-lg">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'pending' | 'in-progress' | 'done')}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800 text-lg transition-colors"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Task'}
            </button>
          </form>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">All Tasks</h2>
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tasks yet. Add your first task above!</p>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">{task.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
                            {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => handleUpdateTask(task.id, { status: e.target.value as any })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full px-8 py-5 bg-white text-blue-600 border-2 border-blue-600 text-xl font-semibold rounded-lg shadow-lg hover:bg-blue-50 hover:shadow-xl transition-all duration-200 mt-8"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
