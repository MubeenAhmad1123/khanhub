export default function Loading() {
    return (
        <div style={{
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
        }}>
            {/* Logo */}
            <div style={{ marginBottom: 24 }}>
                <img 
                    src="/logo.webp" 
                    alt="KhanHub" 
                    style={{ width: 120, height: 'auto' }} 
                />
            </div>

            {/* Spinner */}
            <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '3px solid #333',
                borderTop: '3px solid #FF0069',
                animation: 'spin 0.75s linear infinite',
                marginBottom: 16
            }} />

            {/* Platform Text */}
            <p style={{ 
                fontSize: 13, 
                color: 'rgba(255,255,255,0.5)', 
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500
            }}>
                Pakistan's Video Job Platform
            </p>

            <style>{`
                @keyframes spin { 
                    from { transform: rotate(0deg); } 
                    to { transform: rotate(360deg); } 
                }
            `}</style>
        </div>
    );
}
