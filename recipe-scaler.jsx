import { useState } from "react";

const RecipeScaler = () => {
  const [servings, setServings] = useState(4);
  const baseServings = 4;
  const ratio = servings / baseServings;

  const ingredients = [
    { name: "Flour", amount: 2, unit: "cups" },
    { name: "Sugar", amount: 0.75, unit: "cups" },
    { name: "Eggs", amount: 3, unit: "" },
    { name: "Butter", amount: 0.5, unit: "cups" },
    { name: "Milk", amount: 1, unit: "cup" },
    { name: "Vanilla", amount: 1, unit: "tsp" },
  ];

  const formatAmount = (n) => {
    if (n === Math.floor(n)) return n.toString();
    const wholes = Math.floor(n);
    const frac = n - wholes;
    const fracs = [
      [0.25, "\u00BC"], [0.33, "\u2153"], [0.5, "\u00BD"],
      [0.67, "\u2154"], [0.75, "\u00BE"], [0.2, "\u2155"],
    ];
    for (const [v, s] of fracs) {
      if (Math.abs(frac - v) < 0.04) return wholes ? `${wholes}${s}` : s;
    }
    return n % 1 === 0 ? n.toString() : n.toFixed(1);
  };

  const maxAmount = Math.max(...ingredients.map(i => i.amount * ratio));

  return (
    <div style={{ padding: "1.5rem 0" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "16px",
        marginBottom: "24px", flexWrap: "wrap"
      }}>
        <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Recipe for
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setServings(Math.max(1, servings - 1))}
            style={{
              width: "32px", height: "32px", borderRadius: "50%",
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)",
              cursor: "pointer", fontSize: "16px",
              color: "var(--color-text-primary)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >−</button>
          <span style={{
            fontSize: "24px", fontWeight: 500, minWidth: "36px",
            textAlign: "center", color: "var(--color-text-primary)"
          }}>{servings}</span>
          <button
            onClick={() => setServings(Math.min(20, servings + 1))}
            style={{
              width: "32px", height: "32px", borderRadius: "50%",
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)",
              cursor: "pointer", fontSize: "16px",
              color: "var(--color-text-primary)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >+</button>
        </div>
        <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
          people
        </span>
        {ratio !== 1 && (
          <span style={{
            fontSize: "12px", padding: "2px 10px",
            borderRadius: "var(--border-radius-md)",
            background: ratio > 1 ? "#E1F5EE" : "#FAEEDA",
            color: ratio > 1 ? "#085041" : "#854F0B"
          }}>
            {ratio > 1 ? `${ratio}x more` : `${ratio}x less`}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {ingredients.map((ing, i) => {
          const scaled = ing.amount * ratio;
          const barWidth = maxAmount > 0 ? (scaled / maxAmount) * 100 : 0;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "12px"
            }}>
              <span style={{
                fontSize: "13px", color: "var(--color-text-secondary)",
                minWidth: "70px", textAlign: "right"
              }}>{ing.name}</span>
              <div style={{
                flex: 1, height: "28px", background: "var(--color-background-secondary)",
                borderRadius: "6px", position: "relative", overflow: "hidden"
              }}>
                <div style={{
                  height: "100%", width: `${Math.max(barWidth, 2)}%`,
                  background: "#1D9E75", borderRadius: "6px",
                  transition: "width 0.3s ease-out", opacity: 0.7
                }} />
                <span style={{
                  position: "absolute", left: "10px", top: "50%",
                  transform: "translateY(-50%)", fontSize: "13px",
                  fontWeight: 500, color: barWidth > 15 ? "#fff" : "var(--color-text-primary)"
                }}>
                  {formatAmount(scaled)} {ing.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: "20px", padding: "12px 16px",
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        fontSize: "13px", color: "var(--color-text-secondary)",
        lineHeight: 1.6
      }}>
        {servings === baseServings ? (
          <span>Original recipe — no scaling needed.</span>
        ) : servings === baseServings * 2 ? (
          <span>Double the recipe: every ingredient is multiplied by 2.</span>
        ) : servings === baseServings / 2 ? (
          <span>Half the recipe: every ingredient is divided by 2.</span>
        ) : (
          <span>
            Scaling from {baseServings} to {servings} people means multiplying
            everything by {formatAmount(ratio)} ({servings}/{baseServings}).
          </span>
        )}
      </div>
    </div>
  );
};

export default RecipeScaler;
