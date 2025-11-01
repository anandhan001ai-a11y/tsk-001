import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([
    'Finish homework',
    'Call John',
    'Buy groceries'
  ]);
  const [newTask, setNewTask] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask('');
    }
  };

  const handleLogout = () => {
    // TODO: Add logout logic here
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-300 to-cyan-200 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-600 mb-12 text-center">
            Your Tasks
          </h1>

          <div className="mb-12">
            <ul className="space-y-4">
              {tasks.map((task, index) => (
                <li
                  key={index}
                  className="flex items-start text-gray-700 text-lg"
                >
                  <span className="font-semibold text-blue-600 mr-3">
                    {index + 1}.
                  </span>
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleAddTask} className="mb-8">
            <label htmlFor="newTask" className="block text-gray-700 font-semibold mb-3 text-lg">
              New Task
            </label>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                id="newTask"
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="flex-1 px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800 text-lg transition-colors"
                placeholder="Enter a new task"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 whitespace-nowrap"
              >
                Add Task
              </button>
            </div>
          </form>

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
