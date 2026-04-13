import { useState, useEffect } from 'react';
import type { ServerConfig } from '@uigen/core';
import { Select } from './ui/select';
import { Label } from './ui/label';
import { storeSelectedServer, getSelectedServer } from '@/lib/server';

interface ServerSelectorProps {
  servers: ServerConfig[];
}

/**
 * Server selector component for switching between API environments
 * Implements Requirements 19.1, 19.2, 19.5, 19.6
 */
export function ServerSelector({ servers }: ServerSelectorProps) {
  // Requirement 19.6: Don't render if only one server
  if (servers.length <= 1) {
    return null;
  }

  const [selectedServer, setSelectedServer] = useState<string>(() => {
    // Requirement 19.5: Display currently selected server
    const stored = getSelectedServer();
    // Default to first server if none selected
    return stored || servers[0].url;
  });

  // Requirement 19.3: Store selected server in session storage on mount
  useEffect(() => {
    if (!getSelectedServer() && servers.length > 0) {
      storeSelectedServer(servers[0].url);
    }
  }, [servers]);

  const handleServerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newServer = event.target.value;
    setSelectedServer(newServer);
    // Requirement 19.3: Store selected server in session storage
    storeSelectedServer(newServer);
  };

  return (
    <div className="border-t p-4 space-y-2">
      <Label htmlFor="server-selector" className="text-xs font-semibold">
        API Environment
      </Label>
      {/* Requirement 19.1: Render server selection dropdown when multiple servers defined */}
      <Select
        id="server-selector"
        value={selectedServer}
        onChange={handleServerChange}
        className="text-sm"
      >
        {servers.map((server) => (
          <option key={server.url} value={server.url}>
            {/* Requirement 19.2: Display server descriptions as labels */}
            {server.description || server.url}
          </option>
        ))}
      </Select>
    </div>
  );
}
