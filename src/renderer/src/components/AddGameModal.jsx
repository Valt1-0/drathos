import { useState } from "react";

const AddGameModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    releaseDate: "",
    imageSrc: "",
    badgeType: "new",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    const newGame = {
      ...form,
      addedDate: new Date().toISOString(),
    };
    onSave(newGame);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 text-white p-6 rounded-xl w-full max-w-lg relative shadow-2xl animate-fade-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          <span className="text-2xl">&times;</span>
        </button>

        <h2 className="text-2xl font-semibold mb-4">Add a New Game</h2>

        <div className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Game Name"
            value={form.name}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          />
          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          />
          <input
            type="date"
            name="releaseDate"
            value={form.releaseDate}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          />
          <input
            type="text"
            name="imageSrc"
            placeholder="Image URL"
            value={form.imageSrc}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          />
          <select
            name="badgeType"
            value={form.badgeType}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          >
            <option value="new">New</option>
            <option value="popular">Popular</option>
            <option value="soon">Coming Soon</option>
          </select>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Add Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGameModal;
