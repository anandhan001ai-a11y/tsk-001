import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Profile from '../components/Profile';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'done';
  created_at: string;
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'pending' | 'in-progress' | 'done'>('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [generatedSuggestions, setGeneratedSuggestions] = useState<Record<string, string[]>>({});
  const [generatingForTask, setGeneratingForTask] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      fetchAllSubtasks();
    }
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      setUserId(user.id);

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

      const { data: insertedTask, error } = await supabase
        .from('tasks')
        .insert([
          {
            user_id: user.id,
            title: newTask.trim(),
            priority,
            status,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (insertedTask) {
        await generateTaskEmbedding(insertedTask.id, insertedTask.title);
      }

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

  const fetchAllSubtasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const subtasksByTask: Record<string, Subtask[]> = {};
      data?.forEach((subtask) => {
        if (!subtasksByTask[subtask.task_id]) {
          subtasksByTask[subtask.task_id] = [];
        }
        subtasksByTask[subtask.task_id].push(subtask);
      });

      setSubtasks(subtasksByTask);
    } catch (err: any) {
      console.error('Failed to fetch subtasks:', err);
    }
  };

  const handleGenerateSubtasks = async (taskId: string, taskTitle: string) => {
    setGeneratingForTask(taskId);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-subtasks`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate subtasks');
      }

      const result = await response.json();

      setGeneratedSuggestions(prev => ({
        ...prev,
        [taskId]: result.subtasks || [],
      }));

      setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
    } catch (err: any) {
      setError(err.message || 'Failed to generate subtasks');
    } finally {
      setGeneratingForTask(null);
    }
  };

  const handleSaveSubtask = async (taskId: string, subtaskTitle: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      const { error } = await supabase
        .from('subtasks')
        .insert([{
          task_id: taskId,
          user_id: user.id,
          title: subtaskTitle,
        }]);

      if (error) throw error;

      await fetchAllSubtasks();

      setGeneratedSuggestions(prev => ({
        ...prev,
        [taskId]: prev[taskId].filter(s => s !== subtaskTitle),
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to save subtask');
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ completed: !completed })
        .eq('id', subtaskId);

      if (error) throw error;

      await fetchAllSubtasks();
    } catch (err: any) {
      setError(err.message || 'Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;

      await fetchAllSubtasks();
    } catch (err: any) {
      setError(err.message || 'Failed to delete subtask');
    }
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const generateTaskEmbedding = async (taskId: string, taskTitle: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-task-embedding`;

      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, taskTitle }),
      });
    } catch (err) {
      console.error('Failed to generate embedding:', err);
    }
  };

  const handleSmartSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-search`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error('Failed to search tasks');
      }

      const result = await response.json();
      setSearchResults(result.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to search tasks');
    } finally {
      setSearching(false);
    }
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
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-600 mb-12 text-center">
            Your Tasks
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Smart Search</h2>
            <form onSubmit={handleSmartSearch} className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks using natural language..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800 transition-colors"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Similar Tasks Found:</h3>
                <ul className="space-y-2">
                  {searchResults.map((task) => (
                    <li key={task.id} className="bg-white p-3 rounded-lg border border-blue-100">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">{task.title}</span>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">No similar tasks found. Try a different search query.</p>
              </div>
            )}
          </div>

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
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                          </span>
                          <span className={`task-status px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
                            {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleGenerateSubtasks(task.id, task.title)}
                          disabled={generatingForTask === task.id}
                          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingForTask === task.id ? 'Generating...' : 'Generate Subtasks with AI'}
                        </button>

                        {generatedSuggestions[task.id] && generatedSuggestions[task.id].length > 0 && (
                          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">AI Suggestions:</h4>
                            <ul className="space-y-2">
                              {generatedSuggestions[task.id].map((suggestion, idx) => (
                                <li key={idx} className="flex items-center justify-between gap-2">
                                  <span className="text-sm text-gray-700">{suggestion}</span>
                                  <button
                                    onClick={() => handleSaveSubtask(task.id, suggestion)}
                                    className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors"
                                  >
                                    Save
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {subtasks[task.id] && subtasks[task.id].length > 0 && (
                          <div className="mt-4">
                            <button
                              onClick={() => toggleTaskExpanded(task.id)}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-800 mb-2"
                            >
                              {expandedTasks[task.id] ? '▼' : '▶'} Subtasks ({subtasks[task.id].length})
                            </button>

                            {expandedTasks[task.id] && (
                              <ul className="space-y-2 mt-2">
                                {subtasks[task.id].map((subtask) => (
                                  <li
                                    key={subtask.id}
                                    className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-gray-200"
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={subtask.completed}
                                        onChange={() => handleToggleSubtask(subtask.id, subtask.completed)}
                                        className="w-4 h-4 cursor-pointer"
                                      />
                                      <span className={`text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                        {subtask.title}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteSubtask(subtask.id)}
                                      className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
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

      <div className="lg:col-span-1 order-1 lg:order-2">
        {userId && <Profile userId={userId} />}
      </div>
    </div>
      </div>
    </div>
  );
}

export default Dashboard;
