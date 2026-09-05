# Validation Cases

## Purpose

These validation cases verify that the Threat-Zone Estimator behaves according to the project requirements.

---

## V01 — Single Tank Thermal Radiation

**Scenario:** S01

### Input

- Configuration: Single tank
- Tank diameter: 20 m
- Tank height: 15 m
- Wind speed: 8 m/s
- Wind direction: 90°
- Hazard: Thermal radiation

### Expected

- Thermal radiation hazard zones are generated.
- At least three severity levels are displayed.
- Hazard geometry is spatially varying.
- Wind affects the hazard geometry.

### Result

- [ ] Pass
- [ ] Fail

---

## V02 — Multiple Tank Configuration

**Scenario:** S02

### Input

- Configuration: Two tanks
- Tank separation: 30 m
- Wind speed: 8 m/s
- Wind direction: 90°
- Hazard: Thermal radiation

### Expected

- Both tanks are represented.
- Hazard zones differ from the single-tank configuration.
- Facility geometry influences the result.

### Result

- [ ] Pass
- [ ] Fail

---

## V03 — Wind Direction

**Scenario:** S03

### Test

Run the same facility with wind directions:

- 0°
- 90°
- 180°
- 270°

### Expected

The hazard field changes orientation as wind direction changes.

### Result

- [ ] Pass
- [ ] Fail

---

## V04 — Blast Overpressure

### Input

Use the baseline facility configuration with the blast hazard selected.

### Expected

- Blast overpressure zones are generated.
- At least three severity levels are displayed.
- The result differs from the thermal radiation model.

### Result

- [ ] Pass
- [ ] Fail

---

## V05 — Hazard Legend

### Expected

The interface clearly identifies:

- Critical
- High
- Moderate

### Result

- [ ] Pass
- [ ] Fail

---

## V06 — Recommended Approach Direction

### Expected

The application provides a model-based lower-hazard approach direction.

### Result

- [ ] Pass
- [ ] Fail