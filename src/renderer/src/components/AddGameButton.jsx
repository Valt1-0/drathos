const AddGameButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition"
  >
    <span className="text-lg font-semibold">+ Add Game</span>
  </button>
);

export default AddGameButton;
