# PathOS

PathOS is IT PATH's fictional behavioral operating system.

It aims for realistic operating-system causality while remaining safe and deterministic in a browser. It does not emulate x86/ARM instructions or boot a third-party guest OS.

## Architecture

Virtual hardware -> PathKernel -> system calls/services -> OS personality -> applications -> desktop/mobile UI.

The existing terminal machine remains the compatibility state during migration. New functionality should enter through PathOS kernel contracts so File Manager, terminal, Task Manager, Settings, applications and future mobile shells all observe the same state.

## Rule

If a learner can see a control and reasonably expects it to work, it should either perform a meaningful simulated operation or be clearly unavailable. Decorative fake controls are not a target state.
