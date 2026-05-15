import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uygulama hatası:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)",
            color: "#fff",
            textAlign: "center",
            padding: "2rem",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎸</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Bir sorun oluştu
          </h2>
          <p style={{ fontSize: "1rem", opacity: 0.7, marginBottom: "1.5rem" }}>
            Sayfayı yenileyerek tekrar dene.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "rgba(108,99,255,0.85)",
              color: "#fff",
              border: "none",
              borderRadius: "9999px",
              padding: "0.65rem 2rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
