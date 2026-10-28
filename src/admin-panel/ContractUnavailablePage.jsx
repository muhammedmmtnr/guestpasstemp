function ContractUnavailablePage({ title, endpoint, details }) {
  return (
    <main className="user-details-page">
      <a className="user-details-back" href="/">← Back to dashboard</a>
      <section className="user-details-card contract-unavailable" aria-labelledby="contract-title">
        <p className="user-details-eyebrow">GuestPass account</p>
        <h1 id="contract-title">{title}</h1>
        <p>
          This feature is unavailable until its required backend contract or
          configuration is provided. The UI will not send guessed data or
          credentials to the backend.
        </p>
        <div className="contract-endpoint">
          <span>Endpoint</span>
          <code>{endpoint}</code>
        </div>
        <h2>Backend details required</h2>
        <ul>
          {details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
        <p className="contract-note">
          Backend source and OpenAPI/Swagger documentation have not been
          provided. Check the README for the exact configuration or contract
          needed for this feature.
        </p>
      </section>
    </main>
  );
}

export default ContractUnavailablePage;
