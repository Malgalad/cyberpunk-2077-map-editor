import * as React from "react";

import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import Select from "../components/common/Select.tsx";
import { KNOWN_MESH_NAMES, KNOWN_MESHES } from "../constants.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import type { Map3D } from "../map3d/map3d.ts";
import type { ModalProps } from "../types/modals.ts";
import type { DefaultMeshNames } from "../types/types.ts";

interface MeshOverridesFormProps extends ModalProps {
  map3d: Map3D;
}

function MeshOverridesForm({ map3d, onClose }: MeshOverridesFormProps) {
  const statuses = React.useSyncExternalStore(
    map3d.subscribeMeshOverrides,
    map3d.getMeshOverrides,
  );
  const [name, setName] = React.useState<DefaultMeshNames>(KNOWN_MESHES[0]);
  const [file, setFile] = React.useState<File>();
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const operation = React.useRef<AbortController | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const active = statuses.find((status) => status.name === name);

  React.useEffect(() => () => operation.current?.abort(), []);

  const apply = async () => {
    if (!file || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError("");
    try {
      const applied = await map3d.applyMeshOverride(
        name,
        file,
        controller.signal,
      );
      if (!controller.signal.aborted && applied) {
        setFile(undefined);
        if (fileInput.current) fileInput.current.value = "";
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(
          error instanceof Error
            ? error.message
            : "Could not decode the Draco file.",
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        operation.current = null;
        setBusy(false);
      }
    }
  };

  return (
    <Modal
      title="Override default meshes"
      className="w-[min(32rem,calc(100vw-2rem))]!"
      footer={
        <>
          <Button
            disabled={busy || !active?.filename}
            onClick={() => {
              map3d.restoreDefaultMesh(name);
              setError("");
            }}
          >
            Restore default
          </Button>
          <Button disabled={busy || !file} onClick={() => void apply()}>
            {busy ? "Applying…" : "Apply override"}
          </Button>
          <Button onClick={() => onClose()}>Close</Button>
        </>
      }
    >
      <label className="flex flex-col gap-2">
        Mesh
        <Select
          value={name}
          disabled={busy}
          items={statuses.map((status) => ({
            value: status.name,
            label: `${KNOWN_MESH_NAMES[status.name]}${status.filename ? " (overridden)" : ""}`,
          }))}
          onChange={(event) => {
            const selected = KNOWN_MESHES.find(
              (mesh) => mesh === event.target.value,
            );
            if (!selected) return;
            setName(selected);
            setFile(undefined);
            setError("");
          }}
        />
      </label>
      <p className="break-all">
        Current source:{" "}
        <span className="text-amber-200">{active?.filename ?? "Default"}</span>
      </p>
      <label className="flex flex-col gap-2">
        Replacement file
        <input
          key={name}
          ref={fileInput}
          type="file"
          accept=".drc"
          disabled={busy}
          className="w-full border border-slate-600 p-2 disabled:opacity-50"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (!selected) return;
            setFile(selected);
            setError("");
          }}
        />
      </label>
      <p className="text-sm text-slate-300">
        Use the same local coordinates and units as the original mesh. Its
        position, scale, rotation, and materials are preserved.
      </p>
      {error && (
        <p role="alert" className="text-amber-300">
          {error}
        </p>
      )}
      {busy && <p role="status">Decoding replacement mesh…</p>}
      <p className="text-sm text-amber-200">
        Temporary: overrides are cleared when you reload the page or open or
        reload a project. They are not saved with the project.
      </p>
    </Modal>
  );
}

export default function MeshOverridesModal(props: ModalProps) {
  const map3d = useMap3D();
  if (!map3d) return null;
  return <MeshOverridesForm {...props} map3d={map3d} />;
}
