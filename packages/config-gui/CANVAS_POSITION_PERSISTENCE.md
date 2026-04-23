# Canvas Position Persistence

The Relationship Editor's GraphCanvas component now supports persistent storage of node positions. Card positions are automatically saved to `.uigen/config.yaml` and restored when you reload the application.

## Features

### Automatic Position Saving
- **Auto-save**: Positions are automatically saved 500ms after you finish dragging a card
- **Debounced writes**: Multiple rapid position changes are batched into a single save operation
- **Visual feedback**: A "Saving layout..." indicator appears during save operations
- **Error handling**: If a save fails, you'll see an error notification with a retry button (up to 3 attempts)

### Default Grid Layout
- New resources are automatically placed in a grid layout with consistent spacing
- Grid parameters:
  - **Card size**: 160px × 80px
  - **Gap between cards**: 56px
  - **Padding from edges**: 48px
  - **Columns**: 4 cards per row

### Reset Layout
- Click the "Reset Layout" button (top-right corner) to restore all cards to the default grid
- A confirmation dialog prevents accidental resets
- Smooth 300ms animation when cards move to their default positions

### Orphaned Position Cleanup
- When resources are removed from your spec, their saved positions are automatically cleaned up
- This keeps your config file clean and prevents stale data accumulation

## Configuration File Structure

Positions are stored in `.uigen/config.yaml` under the `canvasLayout` field:

```yaml
version: "1.0"
canvasLayout:
  positions:
    users:
      x: 100
      y: 200
    orders:
      x: 300
      y: 400
    products:
      x: 500
      y: 600
# ... other config fields
```

## Performance

The position management system is optimized for smooth performance:

- **Position save**: <500ms for 100 resources
- **Position load**: <100ms for 50 resources
- **Layout calculation**: O(1) grid slot lookup using spatial hashing
- **Drag operations**: 60fps with React.memo optimization

## Team Collaboration

### Merge Conflicts

When working in a team, you may encounter merge conflicts in `.uigen/config.yaml` if multiple people rearrange the canvas layout.

**Resolution strategies:**

1. **Accept yours**: Keep your layout, discard theirs
   ```bash
   git checkout --ours .uigen/config.yaml
   ```

2. **Accept theirs**: Keep their layout, discard yours
   ```bash
   git checkout --theirs .uigen/config.yaml
   ```

3. **Manual merge**: Combine both layouts
   - Open `.uigen/config.yaml` in your editor
   - Manually merge the `canvasLayout.positions` section
   - Keep positions that make sense for your workflow

4. **Reset and rearrange**: Start fresh
   - Resolve the conflict by accepting either version
   - Open the Relationship Editor
   - Click "Reset Layout" to restore the default grid
   - Rearrange cards as needed

### Best Practices

- **Commit layout changes separately**: When rearranging the canvas, commit those changes separately from functional changes
- **Communicate with your team**: Let teammates know when you've made significant layout changes
- **Use Reset Layout**: If layouts become too divergent, agree to reset to the default grid and start fresh
- **Consider .gitignore**: For large teams, you might want to add `canvasLayout` to `.gitignore` and let each developer maintain their own layout

## Architecture

The canvas position persistence feature follows a clean architecture with three main abstractions:

### PositionManager
Business logic for position management. Coordinates between the persistence layer and layout calculation.

**Key methods:**
- `initializePositions(slugs)`: Load saved positions and calculate defaults for new resources
- `setPosition(slug, position)`: Save a position for a resource
- `resetToDefault(slugs)`: Clear all saved positions and restore default grid
- `cleanupOrphanedPositions(slugs)`: Remove positions for deleted resources

### LayoutStrategy
Algorithm for calculating default positions. The `GridLayoutStrategy` implementation places cards in a grid pattern with consistent spacing.

**Features:**
- Left-to-right, top-to-bottom placement
- Spatial hashing for O(1) overlap detection
- Automatic row wrapping after 4 columns
- World bounds clamping

### PersistenceAdapter
Interface for reading/writing positions to storage. The `ConfigFilePersistenceAdapter` implementation saves positions to `.uigen/config.yaml`.

**Features:**
- Debounced saves (500ms) to prevent excessive writes
- Preserves all other config fields
- Graceful error handling
- Async/await API

## API Reference

### PositionManager

```typescript
class PositionManager {
  constructor(
    adapter: PositionPersistenceAdapter,
    layoutStrategy: LayoutStrategy,
    worldBounds: { width: number; height: number }
  );

  // Initialize positions for resources
  async initializePositions(slugs: string[]): Promise<Map<string, NodePosition>>;

  // Get position for a single resource
  async getPosition(slug: string, allSlugs: string[]): Promise<NodePosition>;

  // Set position for a resource
  async setPosition(slug: string, position: NodePosition): Promise<void>;

  // Get all saved positions
  async getAllPositions(): Promise<Record<string, NodePosition>>;

  // Reset all positions to default grid
  async resetToDefault(slugs: string[]): Promise<Map<string, NodePosition>>;

  // Clean up positions for deleted resources
  async cleanupOrphanedPositions(currentSlugs: string[]): Promise<void>;

  // Validate and clamp position to world bounds
  validatePosition(position: NodePosition): NodePosition;

  // Calculate default position for a new resource
  calculateDefaultPosition(
    slug: string,
    existingPositions: Record<string, NodePosition>
  ): NodePosition;
}
```

### LayoutStrategy

```typescript
interface LayoutStrategy {
  calculatePosition(
    slug: string,
    existingPositions: Record<string, NodePosition>,
    cardDimensions: { width: number; height: number }
  ): NodePosition;
}

class GridLayoutStrategy implements LayoutStrategy {
  constructor(
    cardWidth: number,
    cardHeight: number,
    gap: number,
    padding: number,
    columns: number,
    worldBounds: { width: number; height: number }
  );
}
```

### PersistenceAdapter

```typescript
interface PositionPersistenceAdapter {
  load(): Promise<Record<string, NodePosition>>;
  save(positions: Record<string, NodePosition>): Promise<void>;
  savePan?(pan: { x: number; y: number }): Promise<void>;
  loadPan?(): Promise<{ x: number; y: number } | null>;
}

class ConfigFilePersistenceAdapter implements PositionPersistenceAdapter {
  constructor(
    loadConfig: () => Promise<ConfigFile>,
    saveConfig: (config: ConfigFile) => Promise<void>,
    debounceMs?: number  // Default: 500ms
  );
}
```

## Testing

The feature includes comprehensive test coverage:

- **Unit tests**: 64 tests for PositionManager, LayoutStrategy, and PersistenceAdapter
- **Property-based tests**: 11 properties validated with 100 iterations each using fast-check
- **Integration tests**: 13 tests for GraphCanvas position persistence
- **Performance tests**: 8 tests verifying performance requirements

Run tests:
```bash
cd packages/config-gui
pnpm vitest run
```

## Troubleshooting

### Positions not saving
1. Check browser console for error messages
2. Verify `.uigen/config.yaml` is writable
3. Check the error notification for details
4. Try the retry button (up to 3 attempts)

### Positions not loading
1. Check `.uigen/config.yaml` for the `canvasLayout` field
2. Verify the YAML syntax is valid
3. Check browser console for parsing errors
4. Try resetting the layout and rearranging

### Cards overlapping after load
1. This may indicate corrupted position data
2. Click "Reset Layout" to restore the default grid
3. Rearrange cards as needed

### Performance issues
1. The system is optimized for 50+ resources
2. If you have 100+ resources, consider organizing them into separate views
3. Check browser console for performance warnings
4. Disable browser extensions that might interfere with React

## Future Enhancements

Potential improvements for future versions:

- **Multiple layouts**: Save and switch between different layout presets
- **Auto-arrange**: Automatically organize cards based on relationships
- **Zoom and pan persistence**: Save viewport position and zoom level
- **Layout templates**: Pre-defined layouts for common patterns (CRUD, microservices, etc.)
- **Collaborative layouts**: Real-time layout synchronization for team collaboration
- **Layout history**: Undo/redo for layout changes
- **Export/import**: Share layouts between projects

## Related Documentation

- [Relationship Editor Guide](./docs/relationship-editor.md)
- [Config File Reference](./docs/config-file.md)
- [Architecture Overview](../../ARCHITECTURE.md)
