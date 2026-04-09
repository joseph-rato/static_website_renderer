import React from "react";
import type { TeamMember } from "@pagoda/schema";

export function Team({
  title,
  richText,
  members,
  style,
  ...rest
}: {
  title: string;
  richText?: string;
  members: TeamMember[];
  style?: React.CSSProperties;
  className?: string;
  "data-sr-id"?: string;
}) {
  return (
    <section
      className="section team-section"
      style={{
        backgroundColor: "white",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 20px",
        ...style,
      }}
      data-sr-id={rest["data-sr-id"]}
    >
      <div className="section-container team-container" style={{ maxWidth: "992px", width: "100%", margin: "0 auto", textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "var(--font-primary), serif",
            fontSize: "2.5rem",
            color: "var(--color-primary)",
            marginBottom: "30px",
          }}
        >
          {title}
        </h2>

        {richText && (
          <div
            className="team-intro rich-text-content"
            style={{
              maxWidth: "800px",
              margin: "0 auto 50px",
              textAlign: "center",
              fontFamily: "var(--font-secondary), sans-serif",
            }}
            dangerouslySetInnerHTML={{ __html: richText }}
          />
        )}

        <div
          className="team-grid"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "30px",
            marginTop: "40px",
          }}
        >
          {members.map((member) => (
            <div
              key={member.id}
              className="team-member"
              style={{
                background: "#f8f9fa",
                borderRadius: "15px",
                padding: "30px",
                textAlign: "center",
                maxWidth: "300px",
                flex: "0 1 calc(50% - 15px)",
              }}
            >
              {member.photoUrl ? (
                <div
                  className="member-photo"
                  style={{
                    width: "150px",
                    height: "150px",
                    borderRadius: "50%",
                    margin: "0 auto 20px",
                    overflow: "hidden",
                    border: "4px solid var(--color-primary)",
                  }}
                >
                  <img
                    src={member.photoUrl}
                    alt={`${member.firstName} ${member.lastName}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ) : (
                <div
                  className="member-photo placeholder"
                  style={{
                    width: "150px",
                    height: "150px",
                    borderRadius: "50%",
                    margin: "0 auto 20px",
                    background: "var(--color-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "3rem",
                    fontWeight: "bold",
                    border: "4px solid var(--color-primary)",
                  }}
                >
                  {member.firstName[0]}
                </div>
              )}

              <div className="member-info">
                <h3
                  style={{
                    color: "var(--color-primary)",
                    fontSize: "1.5rem",
                    marginBottom: "10px",
                    fontFamily: "var(--font-primary), serif",
                  }}
                >
                  {member.firstName} {member.lastName}
                </h3>
                {member.title && (
                  <p
                    className="member-title"
                    style={{
                      color: "#6B7280",
                      fontSize: "1.1rem",
                      marginBottom: "10px",
                      fontFamily: "var(--font-secondary), sans-serif",
                    }}
                  >
                    {member.title}
                  </p>
                )}
                {member.bio && (
                  <p style={{ color: "#495057", fontSize: "0.95rem", lineHeight: 1.6 }}>
                    {member.bio}
                  </p>
                )}
                {member.email && (
                  <div className="member-email" style={{ marginTop: "10px" }}>
                    <a
                      href={`mailto:${member.email}`}
                      style={{ color: "var(--color-primary)", textDecoration: "none", fontSize: "0.9rem" }}
                    >
                      {member.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
