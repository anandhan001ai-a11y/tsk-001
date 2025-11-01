function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-300 to-cyan-200">
      <div className="w-full max-w-2xl px-6 py-12 flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-16 text-center tracking-tight drop-shadow-lg">
          Welcome to My Task Manager
        </h1>

        <div className="w-full flex flex-col md:flex-row gap-6 items-center justify-center">
          <button className="w-full md:w-64 px-8 py-6 bg-white text-blue-600 text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 hover:bg-blue-50">
            Login
          </button>

          <button className="w-full md:w-64 px-8 py-6 bg-white text-blue-600 text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 hover:bg-blue-50">
            Signup
          </button>

          <button className="w-full md:w-64 px-8 py-6 bg-white text-blue-600 text-xl font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 hover:bg-blue-50">
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
