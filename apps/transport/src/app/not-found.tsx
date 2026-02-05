export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-4xl font-bold">404</h1>
            <h2 className="text-2xl mt-4">Page Not Found</h2>
            <p className="mt-2 text-gray-600">
                The page you're looking for doesn't exist.
            </p>
            <a href="/" className="mt-6 btn-primary">
                Go Home
            </a>
        </div>
    );
}