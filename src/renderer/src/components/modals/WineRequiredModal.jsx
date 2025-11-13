import { FiAlertCircle, FiExternalLink, FiTerminal } from "react-icons/fi";

const WineRequiredModal = ({ isOpen, onClose, instructions }) => {
  if (!isOpen || !instructions) return null;

  const handleOpenUrl = () => {
    window.electron.shell.openExternal(instructions.url);
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(instructions.command);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <FiAlertCircle className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              Wine Required
            </h2>
            <p className="text-gray-300">
              This game is a Windows executable (.exe). To run it on {instructions.platform}, you need to install Wine.
            </p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FiTerminal className="w-5 h-5" />
            Recommended Installation
          </h3>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400 mb-2">Method: {instructions.method}</p>
              <div className="bg-gray-800 rounded p-3 flex items-center justify-between">
                <code className="text-green-400 text-sm font-mono flex-1">
                  {instructions.command}
                </code>
                <button
                  onClick={handleCopyCommand}
                  className="ml-3 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">
                For more information about installation:
              </p>
              <button
                onClick={handleOpenUrl}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
              >
                <span>Wine Official Installation Guide</span>
                <FiExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">
            After Installation
          </h4>
          <p className="text-sm text-gray-300">
            Once Wine is installed, restart Drathos and launch the game again. Wine will be automatically detected and used to run Windows games.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Close
          </button>
          <button
            onClick={handleOpenUrl}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <span>View Guide</span>
            <FiExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WineRequiredModal;
