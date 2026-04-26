import { FiAlertCircle, FiExternalLink, FiTerminal } from "react-icons/fi";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const WineRequiredModal = ({ isOpen, onClose, instructions }) => {
  const containerRef = useFocusTrap(isOpen && !!instructions);
  if (!isOpen || !instructions) return null;

  const handleOpenUrl = () => {
    window.electron.shell.openExternal(instructions.url);
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(instructions.command);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div ref={containerRef} role="dialog" aria-modal="true" className="glass backdrop-blur-xl rounded-lg max-w-2xl w-full mx-4 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center">
            <FiAlertCircle className="w-6 h-6 text-warning" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text mb-2">
              Wine Required
            </h2>
            <p className="text-text-secondary">
              This game is a Windows executable (.exe). To run it on {instructions.platform}, you need to install Wine.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <FiTerminal className="w-5 h-5" />
            Recommended Installation
          </h3>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-text-secondary mb-2">Method: {instructions.method}</p>
              <div className="bg-surface/50 rounded p-3 flex items-center justify-between">
                <code className="text-success text-sm font-mono flex-1">
                  {instructions.command}
                </code>
                <button
                  onClick={handleCopyCommand}
                  className="ml-3 px-3 py-1 bg-surface hover:bg-surface/80 rounded text-sm text-text transition"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-sm text-text-secondary mb-2">
                For more information about installation:
              </p>
              <button
                onClick={handleOpenUrl}
                className="flex items-center gap-2 text-primary hover:text-primary/80 transition"
              >
                <span>Wine Official Installation Guide</span>
                <FiExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-primary mb-2">
            After Installation
          </h4>
          <p className="text-sm text-text-secondary">
            Once Wine is installed, restart Drathos and launch the game again. Wine will be automatically detected and used to run Windows games.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-surface hover:bg-surface/80 text-text rounded-lg transition"
          >
            Close
          </button>
          <button
            onClick={handleOpenUrl}
            className="px-6 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition flex items-center gap-2"
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
