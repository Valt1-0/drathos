const Badge = ({ type = "new", className = "" }) => {
  const variants = {
    new: "bg-green-500 text-white",
    hot: "bg-red-600 text-white",
    soon: "bg-yellow-500 text-black",
  };

  const label = {
    new: "New",
    hot: "Hot",
    soon: "Coming Soon",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium shadow-sm ${variants[type]} ${className}`}
    >
      {label[type]}
    </span>
  );
};

export default Badge;
