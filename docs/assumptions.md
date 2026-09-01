# Assumptions and limitations

- The facility is on locally flat, unobstructed terrain; longitude/latitude conversion is adequate only for this small grid.
- Weather is steady and horizontally uniform. Atmospheric stability, turbulence, precipitation, terrain, and buildings are omitted.
- Wind input is meteorological direction FROM, and speed is between 0 and 75 m/s. Wind shaping is a bounded effective-distance approximation.
- Tanks contain a generic hydrocarbon represented by a fixed combustion energy. The user-supplied fuel mass is wholly available to the scenario.
- Thermal radiation uses a steady effective flame and ignores flame tilt details, shielding, smoke, transient burning, and material-specific properties.
- Blast uses TNT equivalence and a coarse lookup approximation. It omits confinement, congestion, reflection, fragmentation, directional venting, and time history.
- Dual sources split mass evenly and use a simple east-west layout. Simultaneous contributions are summed.
- Grid values represent cell centers; boundaries have 25 m discretization and are clipped by the 500 m model extent.
- Severity thresholds are configurable reference levels for demonstration, not declarations of safe or unsafe conditions.
- The lower-hazard compass result considers modeled intensity only. It is not routing advice.

This software is an educational hackathon prototype. It is not certified or suitable for industrial safety design, emergency response, evacuation, regulatory compliance, or real-world life-safety decisions.
