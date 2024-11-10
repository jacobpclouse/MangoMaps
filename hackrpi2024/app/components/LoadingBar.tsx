interface LoadingBarProps {
  loadingProgress: number;
}

const LoadingBar: React.FC<LoadingBarProps> = ({
  loadingProgress,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50">
      <div className="w-1/2 bg-gray-200 rounded-full h-4 mb-4">
        <div
          className="bg-orange-500 h-4 rounded-full"
          style={{ width: `${loadingProgress}%` }}
        />
      </div>
      <p className="text-lg font-semibold text-black">
        Loading map... {loadingProgress}%
      </p>
    </div>
  );
};

export default LoadingBar;
