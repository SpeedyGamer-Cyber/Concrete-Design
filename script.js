// Concrete grade mapping
const concreteGrades = {
  8: 10, 12: 15, 16: 20, 20: 25, 25: 30, 30: 37,
  35: 45, 40: 50, 45: 55, 50: 60, 55: 67, 60: 75,
  70: 85, 80: 95, 90: 105, 100: 115
};

function getCubeStrengthFromCylinder(fck) {
  if (fck in concreteGrades) return concreteGrades[fck];
  throw new Error(`No matching cube strength found for cylinder strength: ${fck} MPa`);
}

function matConcrete(fck, ke) {
  if (fck < 12 || fck > 100) {
    return "Please enter fck greater than 12 MPa and less than 100 MPa.";
  }

  try {
    const fckCube = getCubeStrengthFromCylinder(fck);
    const fcm = fck + 8;
    const fctm = fck <= 50 ? 0.3 * fck ** (2 / 3) : 1.1 * fck ** (1 / 3);
    const fctk_5 = 0.7 * fctm;
    const fctk_95 = 1.3 * fctm;
    const Ecm = ke * fcm ** (1 / 3);

    const ec1 = Math.min(2.8, 0.7 * fcm ** (1 / 3));
    const ecu1 = 3.5;
    const ec2 = 2.0;
    const ecu = 3.5;

    let n, ec3, ecu3;
    if (fck <= 50) {
      n = 2.0;
      ec3 = 1.75;
      ecu3 = 3.5;
    } else {
      n = 1.4 + 23.4 * ((90 - fck) / 100) ** 4;
      ec3 = 1.75 + 0.55 * ((fck - 50) / 40);
      ecu3 = 2.6 + 35 * ((90 - fck) / 100) ** 4;
    }

    return `
<pre>
*****************************************************************
Concrete Properties as per Table 5.1    EN1992-1-1 2023          
Version (Draft)                         Dated : 09/04/2025      
Written: SG                         Validated    TC 09/04/2025   
*****************************************************************

Char. concrete cyl. comp. strength fck (MPa): ${fck.toFixed(1)}
Char. concrete cube comp. strength fck_cube (MPa): ${fckCube.toFixed(1)}
Mean concrete cyl. comp. strength fcm (MPa): ${fcm.toFixed(1)}
Mean tens. strength fctm (MPa): ${fctm.toFixed(1)}
Char. axial tensile strength 5% fctk_0,05 (MPa): ${fctk_5.toFixed(1)}
Char. axial tensile strength 95% fctk_0,95 (MPa): ${fctk_95.toFixed(1)}
Modulus of elasticity of concrete Ecm (GPa): ${(Ecm / 1e3).toFixed(1)}
Strain at max. comp. stress in εc1 (%o): ${ec1.toFixed(2)}
Ultimate comp. strain εcu1 (%o): ${ecu1.toFixed(2)}
Design comp. strain at peak stress εc2 (%o): ${ec2.toFixed(2)}
Design Ulti. comp. strain in concrete εcu (%o): ${ecu.toFixed(2)}

Following are propeties as per Table 3.1 of EN1992-1-1 2004
Below propeties  are not included in EN1992-1-1 2023
n (EN 1992-1-1:2004): ${n.toFixed(2)}
εc3 (%o) (EN 1992-1-1:2004): ${ec3.toFixed(2)}
εcu3 (%o) (EN 1992-1-1:2004): ${ecu3.toFixed(2)}
</pre>`;
  } catch (e) {
    return `<p style="color:red;">Error: ${e.message}</p>`;
  }
}

function calculateConcreteOverTime() {
  const fck = parseFloat(document.getElementById('fck').value);
  const ke = parseFloat(document.getElementById('ke').value);
  const tref = parseFloat(document.getElementById('tref').value);
  const t = parseFloat(document.getElementById('t').value);
  const CEM = document.getElementById('cem').value;

  function Cem_class(fck, CEM) {
    if (CEM === "CS") return fck <= 35 ? 0.6 : fck < 60 ? 0.5 : 0.4;
    if (CEM === "CN") return fck <= 35 ? 0.5 : fck < 60 ? 0.4 : 0.3;
    if (CEM === "CR") return fck <= 35 ? 0.3 : fck < 60 ? 0.2 : 0.1;
    return null;
  }

  function Cal_Bcc_t(sc, tref, t) {
    return Math.exp(sc * (1 - Math.sqrt(tref / t)) * Math.sqrt(28 / tref));
  }

  function Cal_fcm_t(fck, sc, tref, t) {
    const Bcc_t = Cal_Bcc_t(sc, tref, t);
    const fcm = fck + 8;
    return [fcm, Bcc_t * fcm];
  }

  function Cal_Ecm_t(fck, ke, sc, tref, t) {
    const Bcc_t = Cal_Bcc_t(sc, tref, t);
    const fcm = fck + 8;
    const Ecm = ke * Math.pow(fcm, 1 / 3);
    return [Ecm, Math.pow(Bcc_t, 1 / 3) * Ecm];
  }

  function Cal_fctm_t(fck, sc, tref, t) {
    const Bcc_t = Cal_Bcc_t(sc, tref, t);
    let fctm = fck <= 50 ? 0.3 * Math.pow(fck, 2 / 3) : 1.1 * Math.pow(fck, 1 / 3);
    return [fctm, Math.pow(Bcc_t, 0.6) * fctm];
  }

  const sc = Cem_class(fck, CEM);
  const Bcc_t = Cal_Bcc_t(sc, tref, t);
  const [fcm, fcm_t] = Cal_fcm_t(fck, sc, tref, t);
  const [Ecm, Ecm_t] = Cal_Ecm_t(fck, ke, sc, tref, t);
  const [fctm, fctm_t] = Cal_fctm_t(fck, sc, tref, t);

  const resultText = 
    `Coefficient sc: ${sc.toFixed(1)} - Table B.2\n` +
    `Bcc_t: ${Bcc_t.toFixed(2)} - Equation (B.2)\n` +
    `Concrete Mean Strength fcm (MPa): ${fcm.toFixed(2)} - Table 5.1\n` +
    `Concrete Mean Strength at time t fcm_t (MPa): ${fcm_t.toFixed(2)} - Eq (B.2)\n` +
    `Concrete Mean Tensile Strength fctm (MPa): ${fctm.toFixed(2)} - Table 5.1\n` +
    `Concrete Mean Tensile Strength at time t fctm_t (MPa): ${fctm_t.toFixed(2)} - Eq (B.3)\n` +
    `Modulus of Elasticity Ecm (GPa): ${(Ecm / 1000).toFixed(2)} - Eq (5.1)\n` +
    `Modulus of Elasticity at time t Ecm_t (GPa): ${(Ecm_t / 1000).toFixed(2)} - Eq (B.4)`;

  document.getElementById('result').textContent = resultText;

  // Generate data over time for plotting
  let tValues = [], fcm_t_list = [], fctm_t_list = [], Ecm_t_list_GPa = [];

  for (let time = 1; time <= tref; time++) {
    tValues.push(time);
    const [_, fcm_t_i] = Cal_fcm_t(fck, sc, tref, time);
    const [__, fctm_t_i] = Cal_fctm_t(fck, sc, tref, time);
    const [___, Ecm_t_i] = Cal_Ecm_t(fck, ke, sc, tref, time);

    fcm_t_list.push(fcm_t_i);
    fctm_t_list.push(fctm_t_i);
    Ecm_t_list_GPa.push(Ecm_t_i / 1000);
  }

  // Get the chart context
  const ctx = document.getElementById('concreteChart').getContext('2d');

  // Check if there's an existing chart object and destroy it if it exists
  if (window.concreteChart && typeof window.concreteChart.destroy === 'function') {
    window.concreteChart.destroy();
  }

  // Create a new chart instance
  window.concreteChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: tValues,
      datasets: [
        {
          label: 'fcm_t (MPa)',
          data: fcm_t_list,
          borderColor: 'rgba(75, 192, 192, 1)',
          fill: false,
          tension: 0.3,
        },
        {
          label: 'fctm_t (MPa)',
          data: fctm_t_list,
          borderColor: 'rgba(255, 99, 132, 1)',
          fill: false,
          tension: 0.3,
        },
        {
          label: 'Ecm_t (GPa)',
          data: Ecm_t_list_GPa,
          borderColor: 'rgba(54, 162, 235, 1)',
          fill: false,
          tension: 0.3,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Concrete Property Development Over Time',
          font: { size: 18 }
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time (days)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Strength / Modulus'
          }
        }
      }
    }
  });
}

function matSteel(fyk, class_s) {
  let ftk, εuk;
  if (class_s === "A") {
    ftk = 1.05 * fyk;
    εuk = 2.5;
  } else if (class_s === "B") {
    ftk = 1.08 * fyk;
    εuk = 5.0;
  } else if (class_s === "C") {
    ftk = 1.15 * fyk;
    εuk = 7.5;
  } else {
    return "Invalid class_s. Please choose 'A', 'B', or 'C'.";
  }
  return { fyk, ftk, εuk };
}

function loadMatFac(gamma_c, gamma_s, alpha_cc, alpha_cw) {
  return `
    <h3>Load Material Factors</h3>
    <p><strong>Partial factor for concrete (γc):</strong> ${gamma_c}</p>
    <p><strong>Partial factor for reinforcement (γs):</strong> ${gamma_s}</p>
    <p><strong>Bending coefficient for long-term effects (αcc):</strong> ${alpha_cc}</p>
    <p><strong>Shear coefficient for long-term effects (αcw):</strong> ${alpha_cw}</p>
  `;
}

// Bar database
const barDiameters = [6, 8, 10, 12, 14, 16, 20, 25, 28, 32, 40, 50];
const barAreas = {};
barDiameters.forEach(d => {
    barAreas[d] = Math.PI * (d ** 2) / 4;
});

function selectBars(AsReq, b, c) {
    // Return (barDia, numBars, AsProvided) satisfying AsReq
    for (let d of barDiameters) {
        let area = barAreas[d];
        let n = Math.ceil(AsReq / area);
        if ((b - 2 * c) / (n - 1) > 75) {
            let AsProvided = n * area;
            if (AsProvided >= AsReq) {
                return [d, n, AsProvided];
            }
        }
    }
    return [null, null, null];
}

function selectTies(AsReq, sMax) {
    // Return (barDia, numBars, AsProvided) satisfying AsReq
    for (let d of barDiameters) {
        let area = barAreas[d];
        let n = Math.ceil(AsReq / area / 2); // 2 legs per shear tie
        if (100 < 1000 / (n-1) && 1000 / (n-1) < sMax) {
            let AsProvided = 2 * n * area;
            let s = 1000 / (n-1);
            if (AsProvided >= AsReq) {
                return [d, s, AsProvided];
            }
        }
    }
    return [null, null, null];
}

function drawBeamSection(b, h, cover, barsInfo) {
  const canvas = document.getElementById("beamCanvas");
  const ctx = canvas.getContext("2d");

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Scaling for visibility
  const scale = 2; // pixels per mm
  const offsetX = 50;
  const offsetY = 50;

  // Helper function to draw a circle
  function drawCircle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x * scale + offsetX, (h - y) * scale + offsetY, radius * scale, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Draw beam rectangle
  ctx.fillStyle = "lightgray";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(offsetX, offsetY, b * scale, h * scale);
  ctx.fill();
  ctx.stroke();

  // Draw stirrup rectangle
  ctx.strokeStyle = "blue";
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(
    (offsetX + cover * scale),
    (offsetY + cover * scale),
    (b - 2 * cover) * scale,
    (h - 2 * cover) * scale
  );
  ctx.setLineDash([]); // reset dashed line

  // Draw bottom (tension) bars
  const [bar1Dia, bar1Count] = barsInfo.As1 || [0, 0];
  if (bar1Count > 0) {
    const spacing = (b - 2 * cover - bar1Dia) / (bar1Count - 1);
    for (let i = 0; i < bar1Count; i++) {
      const cx = cover + bar1Dia * 0.5 + i * spacing;
      const cy = cover + bar1Dia * 0.5;
      drawCircle(cx, cy, bar1Dia / 2, "red");
    }
  }

  // Draw top (compression) bars
  const [bar2Dia, bar2Count] = barsInfo.As2 || [0, 0];
  if (bar2Count > 0) {
    const spacing = (b - 2 * cover - bar2Dia) / (bar2Count - 1);
    for (let i = 0; i < bar2Count; i++) {
      const cx = cover + bar2Dia * 0.5 + i * spacing;
      const cy = h - cover - bar2Dia * 0.5;
      drawCircle(cx, cy, bar2Dia / 2, "darkred");
    }
  }

  // Add title
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText("RCC Beam Cross-Section", offsetX, offsetY - 10);
}


function designBeam(b, h, cover, fck, ke, fyk, δ, M_Ed, V_Ed, N_Ed, Alpha, Theta, Φt, Φc, Φs, γc, γs, αcc, αcw) {
    const f_ck = fck
    const f_ctm = fck <= 50 ? 0.3 * fck ** (2 / 3) : 1.1 * fck ** (1 / 3);
    const d = h - cover - Φs - 0.5 * Φt;
    const d_prime = cover + 0.5 * Φc + Φs;
    const f_cd = αcc * f_ck / γc;
    const f_cdw = αcw * f_ck / γc;
    const f_yd = fyk / γs;
    const K_max = 0.598 * δ - 0.18 * δ ** 2 - 0.21;

    // Flexure design
    const K = M_Ed / (f_ck * b * d ** 2);
    const M_lim = K_max * f_ck * b * d ** 2;

    let As1, As2 = 0, z, doubly, As_req;

    if (M_Ed <= M_lim) {
        z = Math.min(0.5 * d * (1 + Math.sqrt(1 - 3.53 * K)), 0.95 * d);
        As_req = M_Ed / (f_yd * z);
        As1 = As_req;
        doubly = false;
    } else {
        const xu = (δ - 0.4) * d;
        const M_add = M_Ed - M_lim;
        z = Math.min(0.5 * d * (1 + Math.sqrt(1 - 3.53 * K_max)), 0.95 * d);
        As1 = M_lim / (f_yd * z);
        const z2 = d - d_prime;
        const f_sc = Math.min(f_yd, (700 * (xu - d_prime)) / xu);
        As2 = M_add / (f_sc * z2);
        As_req = As1 + As2;
        doubly = true;
    }

    const rho_min = Math.max(0.26 * f_ctm / fyk, 0.0013);
    const As_min = rho_min * b * d;
    if (As_req < As_min) {
        As_req = As_min;
        As1 = As_req;
        As2 = 0;
        doubly = false;
    }

    const [bar1_dia, bar1_count, As1_provided] = selectBars(As_req, b, cover);
    let bar2_dia = 0, bar2_count = 0, As2_provided = 0;
    if (doubly && As2 > 0) {
        [bar2_dia, bar2_count, As2_provided] = selectBars(As2, b, cover);
    }

    // Shear Design
    const C_Rdc = 0.18 / γc;
    const k1 = 0.15;
    const k = Math.min(2.0, 1 + Math.sqrt(200 / d));
    const rho_1 = Math.min(As_req / (b * d), 0.02);
    const Ac = h * b;
    const Sig_cp = Math.min(N_Ed / Ac, 0.2 * f_cd);

    const v_rdc1 = (C_Rdc * k * Math.pow(100 * rho_1 * f_ck, 1 / 3) + k1 * Sig_cp) * b * d;
    const v_min = 0.035 * Math.pow(k, 1.5) * Math.sqrt(f_ck);
    const v_rdc2 = (v_min + k1 * Sig_cp) * b * d;
    const V_rdc = Math.max(v_rdc1, v_rdc2);

    const Cot_Alpha = 1 / Math.tan(Alpha * Math.PI / 180);
    const Cot_Theta = 1 / Math.tan(Theta * Math.PI / 180);
    const v1 = 0.6 * (1 - f_ck / 250);
    const Asw_per_s = V_Ed / (z * f_yd * (Cot_Theta + Cot_Alpha) * Math.sin(Alpha * Math.PI / 180)) * 1000;
    const V_Rdmax = b * z * v1 * f_cdw * (Cot_Theta + Cot_Alpha) / (1 + Cot_Theta ** 2);

    const rho_wmin = 0.08 * Math.sqrt(f_ck) / fyk;
    const Asw_per_smin = rho_wmin * b * Math.sin(Alpha * Math.PI / 180);
    const Asw_final = Math.max(Asw_per_s, Asw_per_smin);
    const s_max = 0.75 * d * (1 + Cot_Alpha);
    const [bar3_dia, bar3_spacing, Asw_provided] = selectTies(Asw_final, s_max);

    let shear_msg = '', shear_reinforcement = '';

    //console.log("V_Ed:", V_Ed);
    //console.log("V_rdc:", V_rdc);
    //console.log("Cot_Theta:", Cot_Theta);
    //console.log("V_Rdmax:", V_Rdmax);
    //console.log("Asw_final:", Asw_final);
    //console.log("bar3_dia:", bar3_dia);
    //console.log("bar3_spacing:", bar3_spacing);

    if (V_Ed <= V_rdc) {
        shear_msg = `Shear resistance without shear reinforcement: V_rd,c = ${(V_rdc / 1e3).toFixed(2)} kN\n` +
                    `V_Ed = ${(V_Ed / 1e3).toFixed(2)} kN ≤ V_rd,c = ${(V_rdc / 1e3).toFixed(2)} kN\n` +
                    `No shear links needed`;
    } else {
        if (Cot_Theta < 1.0 || Cot_Theta > 2.5) {
            shear_msg = `Cot_Theta = ${Cot_Theta.toFixed(2)} is beyond allowable limits 1 to 2.5\nPlease select Theta between 21.8° to 45°`;
        } else if (V_Ed > V_Rdmax) {
            shear_msg = `Shear capacity limit by comp. capacity of strut V_Rdmax = ${(V_Rdmax / 1e3).toFixed(0)} kN\n` +
                        `Increase Section size:\nV_Ed = ${(V_Ed / 1e3).toFixed(2)} kN > V_Rdmax = ${(V_Rdmax / 1e3).toFixed(2)} kN`;
        } else {
            shear_msg = `Shear resistance without shear reinforcement: V_rd,c = ${(V_rdc / 1e3).toFixed(2)} kN\n` +
                        `V_Ed = ${(V_Ed / 1e3).toFixed(2)} kN > V_rd,c = ${(V_rdc / 1e3).toFixed(2)} kN\n` +
                        `Shear links required\nCot_Theta = ${Cot_Theta.toFixed(2)}\n` +
                        `Shear capacity limit by comp. capacity of strut V_Rdmax = ${(V_Rdmax / 1e3).toFixed(0)} kN`;

            shear_reinforcement = `Shear Reinforcement Asw = ${Asw_final.toFixed(2)} mm²/m → T${bar3_dia} 2 leg\n` +
                                  `Spacing: ${bar3_spacing.toFixed(0)} mm`;
        }
    }

    const bar_msg = doubly ?
        `Effective depth of Tension steel d = ${Math.round(d)} mm\n` +
        `Lever arm of internal forces z = ${Math.round(z)} mm\n` +
        `Measure of relative compressive stress K = ${K.toFixed(2)}\n` +
        `Limiting K_max = ${K_max.toFixed(2)}\n` +
        `Moment capacity M_lim = ${(M_lim / 1e6).toFixed(2)} kNm\n\n` +
        `M > M_lim → Doubly Reinforced\n` +
        `Tension Reinforcement Ast = ${As_req.toFixed(2)} mm² → ${bar1_count}T${bar1_dia}\n` +
        `Compression Reinforcement Asc = ${As2.toFixed(2)} mm² → ${bar2_count}T${bar2_dia}` :
        `Effective depth of Tension steel d = ${Math.round(d)} mm\n` +
        `Lever arm of internal forces z = ${Math.round(z)} mm\n` +
        `Measure of relative compressive stress K = ${K.toFixed(2)}\n` +
        `Limiting K_max = ${K_max.toFixed(2)}\n` +
        `Moment capacity M_lim = ${(M_lim / 1e6).toFixed(2)} kNm\n\n` +
        `M <= M_lim → Singly Reinforced\n` +
        `Tension Reinforcement Ast = ${As1.toFixed(2)} mm² → ${bar1_count}T${bar1_dia}`;
    
//    drawBeamSection(b, h, cover, {
//        As1: [bar1_dia, bar1_count],
//        As2: [bar2_dia, bar2_count]
//    });

    return {bar1_dia, bar1_count, bar2_dia, bar2_count, bar_msg, shear_msg, shear_reinforcement};
}


function showSection(section) {
  const main = document.getElementById('main-window');

  if (section === 'concrete') {
    main.innerHTML = `
      <h2>Material Concrete Properties</h2>
      <form id="concreteForm">
        <div class="form-row">
          <div class="form-group-inline">
            <label for="fck">Strength of Concrete fck (MPa):</label>
            <input type="number" id="fck" step="any" required>
          </div>
          <div class="form-group-inline">
            <label for="ke">Aggregate factor ke (9500 if not known):</label>
            <input type="number" id="ke" step="any" required>
          </div>
        </div>
        <button type="submit">Calculate</button>
      </form>
      <div id="output"></div>
    `;

    document.getElementById("concreteForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const fck = parseFloat(document.getElementById("fck").value);
      const ke = parseFloat(document.getElementById("ke").value);
      const result = matConcrete(fck, ke);
      document.getElementById("output").innerHTML = result;
    });
  

  // Other sections unchanged
  }  else if (section === 'concrete_time') {
        main.innerHTML = `
          <h2>Material: Concrete wrt Time</h2>
          <form id="concreteForm">
            <div class="form-row">
              <div class="form-group-inline">
                <label for="fck">Strength of Concrete fck (MPa):</label>
                <input type="number" id="fck" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="ke">Aggregate factor ke (9500 if not known):</label>
                <input type="number" id="ke" step="any" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group-inline">
                <label for="tref">tref (days):</label>
                <input type="number" id="tref" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="t">t (days):</label>
                <input type="number" id="t" step="any" required>
              </div>
            </div>
                        
            <label>Cement Class: 
              <select id="cem">
                <option value="CS">CS</option>
                <option value="CN">CN</option>
                <option value="CR">CR</option>
              </select>
            </label><br><br>
            <button type="submit">Calculate</button>
          </form>
          <div id="result" style="margin-top: 20px; white-space: pre-line;"></div>
          <canvas id="concreteChart" width="800" height="400" style="margin-top: 40px;"></canvas>
        `;
        document.getElementById('concreteForm').addEventListener('submit', function(e) {
          e.preventDefault();
          calculateConcreteOverTime();
        });
      
  } else if (section === 'steel') {
        main.innerHTML = `
          <h2>Material: Steel Properties</h2>
          <form id="steelForm">
            <div class="form-row">
              <div class="form-group-inline">
                <label for="fyk">Yield strength of reinforcement fyk (MPa):</label>
                <input type="number" id="fyk" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="class_s">Ductility Class of steel:</label>
                <select id="class_s">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>
            <button type="submit">Calculate</button>
          </form>
          <div id="steelOutput" style="margin-top: 20px;"></div>
        `;

        // Handle the form submission for Steel
        document.getElementById("steelForm").addEventListener("submit", function(e) {
          e.preventDefault();
          const fyk = parseFloat(document.getElementById("fyk").value);
          const class_s = document.getElementById("class_s").value.toUpperCase();  // Normalize input to uppercase

          const result = matSteel(fyk, class_s);
          if (typeof result === "string") {
            document.getElementById("steelOutput").innerHTML = `<p style="color:red;">Error: ${result}</p>`;
          } else {
            const { fyk, ftk, εuk } = result;
            document.getElementById("steelOutput").innerHTML = `
              <p>Yield Strength fyk: ${fyk} MPa</p>
              <p>Tensile Strength ftk: ${ftk} MPa</p>
              <p>Ultimate Strain εuk: ${εuk}%</p>
            `;
          }
        });
  } else if (section === 'load_factors') {
        main.innerHTML = `
          <h2>Load Material Factors</h2>
          <form id="loadFactorsForm">
            <div class="form-row">
              <div class="form-group-inline">
                <label for="gamma_c">Partial factor for concrete (γc):</label>
                <input type="number" id="gamma_c" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="gamma_s">Partial factor for reinforcement (γs):</label>
                <input type="number" id="gamma_s" step="any" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group-inline">
                <label for="alpha_cc">Bending long-term effect (αcc):</label>
                <input type="number" id="alpha_cc" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="alpha_cw">Shear long-term effect (αcw):</label>
                <input type="number" id="alpha_cw" step="any" required>
              </div>
            </div>            
 
            <button type="submit">Calculate</button>
          </form>
          <div id="loadFactorsOutput" style="margin-top: 20px;"></div>
        `;

        document.getElementById("loadFactorsForm").addEventListener("submit", function(e) {
          e.preventDefault();
          const gamma_c = parseFloat(document.getElementById("gamma_c").value);
          const gamma_s = parseFloat(document.getElementById("gamma_s").value);
          const alpha_cc = parseFloat(document.getElementById("alpha_cc").value);
          const alpha_cw = parseFloat(document.getElementById("alpha_cw").value);

          const result = loadMatFac(gamma_c, gamma_s, alpha_cc, alpha_cw);
          document.getElementById("loadFactorsOutput").innerHTML = result;
        });
  } else if (section === 'beam_design') {
        main.innerHTML = `
          <h2>Beam Design (EC2004)</h2>
          <form id="beam-design-form">
            <div class="form-row">
              <div class="form-group-inline">
                <label for="fck">Strength of Concrete fck (MPa):</label>
                <input type="number" id="fck" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="ke">Aggregate factor ke (9500 if not known):</label>
                <input type="number" id="ke" step="any" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group-inline">
                <label for="fyk">Yield strength of reinforcement fyk (MPa):</label>
                <input type="number" id="fyk" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="Class_s">Ductility Class of steel:</label>
                <select id="Class_s">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group-inline">
                <label for="gamma_c">Partial factor for concrete γc:</label>
                <input type="number" id="gamma_c" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="gamma_s">Partial factor for reinforcement γs:</label>
                <input type="number" id="gamma_s" step="any" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group-inline">
                <label for="alpha_cc">Bending coef. longterm effects αcc:</label>
                <input type="number" id="alpha_cc" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="alpha_cw">Shear coef. longterm effects αcw:</label>
                <input type="number" id="alpha_cw" step="any" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group-inline">
                <label for="b">Beam width b (mm):</label>
                <input type="number" id="b" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="h">Beam height h (mm):</label>
                <input type="number" id="h" step="any" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group-inline">
                <label for="cover">Concrete cover (mm):</label>
                <input type="number" id="cover" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="delta">Distribution ratio δ:</label>
                <input type="number" id="delta" step="any" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group-inline">
                <label for="M_Ed">Design Moment M_Ed (kNm):</label>
                <input type="number" id="M_Ed" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="V_Ed">Design Shear Force V_Ed (kN):</label>
                <input type="number" id="V_Ed" step="any" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group-inline">
                <label for="N_Ed">Axial force N_Ed (kN):</label>
                <input type="number" id="N_Ed" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="Alpha">Angle between shear rein. and beam axis Alpha (Deg):</label>
                <input type="number" id="Alpha" step="any" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group-inline">
                <label for="Theta">Angle between comp. strut and beam axis Theta (Deg):</label>
                <input type="number" id="Theta" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="Φt">Tension reinforcement Φt (mm):</label>
                <input type="number" id="Φt" step="any" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group-inline">
                <label for="Φc">Compression reinforcement Φc (mm):</label>
                <input type="number" id="Φc" step="any" required>
              </div>
              <div class="form-group-inline">
                <label for="Φs">Shear reinforcement Φs (mm):</label>
                <input type="number" id="Φs" step="any" required>
              </div>
            </div>
            
            <div class="form-group" style="text-align: center;">
              <button type="submit">Calculate</button>
            </div>
          </form>
          <div id="beam-design-results" style="margin-top: 20px;"></div>
        `;

        document.getElementById("beam-design-form").addEventListener("submit", function (e) {
          e.preventDefault();
          const fck = parseFloat(document.getElementById('fck').value);
          const ke = parseFloat(document.getElementById('ke').value);
          const fyk = parseFloat(document.getElementById('fyk').value);
          const Class_s = document.getElementById('Class_s').value;
          const gamma_c = parseFloat(document.getElementById('gamma_c').value);
          const gamma_s = parseFloat(document.getElementById('gamma_s').value);
          const alpha_cc = parseFloat(document.getElementById('alpha_cc').value);
          const alpha_cw = parseFloat(document.getElementById('alpha_cw').value);
          const b = parseFloat(document.getElementById('b').value);
          const h = parseFloat(document.getElementById('h').value);
          const cover = parseFloat(document.getElementById('cover').value);
          const delta = parseFloat(document.getElementById('delta').value);
          const M_Ed = parseFloat(document.getElementById('M_Ed').value) * 1e6; // Convert to Nmm
          const V_Ed = parseFloat(document.getElementById('V_Ed').value) * 1e3; // Convert to N
          const N_Ed = parseFloat(document.getElementById('N_Ed').value) * 1e3; // Convert to N
          const Alpha = parseFloat(document.getElementById('Alpha').value);
          const Theta = parseFloat(document.getElementById('Theta').value);
          const Φt = parseFloat(document.getElementById('Φt').value);
          const Φc = parseFloat(document.getElementById('Φc').value);
          const Φs = parseFloat(document.getElementById('Φs').value);
          const {bar1_dia, bar1_count, bar2_dia, bar2_count, bar_msg, shear_msg, shear_reinforcement} = designBeam(
            b, h, cover, fck, ke, fyk, delta, M_Ed, V_Ed, N_Ed, Alpha, Theta, Φt, Φc, Φs, gamma_c, gamma_s, alpha_cc, alpha_cw
          );
          
        //  console.log("bar_msg:", bar_msg);
        //  console.log("shear_msg:", shear_msg);
        //  console.log("shear_reinforcement:", shear_reinforcement);
        //  console.log("bar1_dia:", bar1_dia);
        //  console.log("bar1_count:", bar1_count);
        //  console.log("bar2_dia:", bar2_dia);
        //  console.log("bar2_count:", bar2_count);

          const resultsDiv = document.getElementById('beam-design-results');
                        
          function nl2br(str) {
            return str.replace(/\n/g, '<br>');
          }
           
          resultsDiv.innerHTML = `
            <h3>Beam Design Results</h3>
            <p><strong>Bending Reinforcement Design:</strong><br> ${nl2br(bar_msg)}</p>
            <p><strong>Shear Design:</strong><br> ${nl2br(shear_msg)}</p>
            <p><strong>Shear Reinforcement:</strong><br> ${nl2br(shear_reinforcement)}</p>
            `;
        });
  } else {
    main.innerHTML = `<h2>Welcome to LR Design Tool</h2><p>Select an option from the left to begin.</p>`;
  }
    // Toggle active class for the clicked button
  const buttons = document.querySelectorAll('.left-pane button');
  buttons.forEach(button => button.classList.remove('active')); // Remove active from all buttons
  document.querySelector(`button[onclick="showSection('${section}')"]`).classList.add('active'); // Add active to clicked button
}
