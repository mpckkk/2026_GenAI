import { redirect } from "next/navigation";
import { services } from "@/app/bootstrap";
import { serviceHealth } from "@/app/services/health";
import styles from "../workspace.module.css";

export default async function HealthPage() {
  if (!(await services.auth.currentUser()))
    redirect("/login?returnTo=/app/health");
  const health = await serviceHealth();
  return (
    <div className={styles.operationsPage}>
      <p className="eyebrow">Workspace operations</p>
      <h1>Service health</h1>
      <p className="page-description">
        Connections checked when this page loads. Pending services are not ready
        for analysis.
      </p>
      <div className="panel health-list">
        {health.map((service) => (
          <div className="health-row" key={service.name}>
            <div>
              <h2>{service.name}</h2>
              <p>{service.detail}</p>
            </div>
            <span className={`pill health-${service.status}`}>
              {service.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
