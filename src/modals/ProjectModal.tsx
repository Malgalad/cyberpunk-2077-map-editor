import { produce } from "immer";
import { TriangleAlert } from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import Input from "../components/common/Input.tsx";
import Modal from "../components/common/Modal.tsx";
import { DEFAULT_DISTRICT_DATA } from "../constants.ts";
import { useAppDispatch, useFilesList } from "../hooks.ts";
import { useLoadProject } from "../hooks/importExport.ts";
import { loadJSON, saveJSON } from "../opfs.ts";
import { hydrateState } from "../store/@actions.ts";
import { getInitialState } from "../store/@selectors.ts";
import type { ModalProps } from "../types/modals.ts";
import { PersistentStateSchema } from "../types/schemas.ts";
import type { PersistentAppState } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";

export type Tabs = "open" | "new" | "load";
const tabs: { key: Tabs; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "new", label: "New" },
  { key: "load", label: "Load" },
];

function ProjectModal(props: ModalProps) {
  const { data: defaultTab = "open" } = props as { data?: Tabs };
  const dispatch = useAppDispatch();
  const [tab, setTab] = React.useState<Tabs>(defaultTab);
  const [rememberProjectName, setRememberProjectName] =
    React.useState<boolean>(true);
  const [selectedProject, setSelectedProject] = React.useState<
    string | undefined
  >(undefined);
  const [name, setName] = React.useState<string>("");
  const [loadedProject, setLoadedProject] = React.useState<
    [string, PersistentAppState] | undefined
  >(undefined);

  const projects = useFilesList("projects");
  const loadProject = useLoadProject();

  const validationError = (() => {
    if (tab === "open") {
      if (projects.length === 0) return "No projects found";
      if (selectedProject === undefined) return "Select a project";
    }

    if (tab === "new") {
      if (name.trim().length === 0) return "Enter a project name";
      if (name.trim().length > 40)
        return "Project name cannot be longer than 40 characters";
      if (projects.includes(name))
        return "Project with this name already exists";
    }

    if (tab === "load") {
      if (loadedProject === undefined) return "Select a project";
      const [, state] = loadedProject;
      if (!state.project.name && name.trim().length === 0)
        return "Enter a project name";
      if (!state.project.name && name.trim().length > 40)
        return "Project name cannot be longer than 40 characters";
      if (projects.includes(name))
        return "Project with this name already exists";
    }

    return "";
  })();
  const isValid = !validationError;

  const handleProject = async () => {
    const persistent: { project: string | undefined } = { project: undefined };
    let state: PersistentAppState | undefined = undefined;

    if (tab === "open") {
      const maybeProject = await loadJSON(`projects/${selectedProject}`);
      state = PersistentStateSchema.parse(maybeProject);

      if (rememberProjectName) persistent.project = selectedProject;
    } else if (tab === "new") {
      state = produce(getInitialState(undefined), (draft) => {
        draft.district.districts = DEFAULT_DISTRICT_DATA;
        draft.project.name = name;
      });
      await saveJSON(`projects/${name}`, state);
      if (rememberProjectName) persistent.project = name;
    } else if (tab === "load") {
      if (!loadedProject) return;
      state = produce(loadedProject[1], (draft) => {
        draft.project.name = name;
      });
      if (rememberProjectName) persistent.project = name;
    }

    if (state) {
      void saveJSON("persistentData", persistent);
      dispatch(hydrateState(state));
      props.onClose();
    }
  };

  React.useEffect(() => {
    setSelectedProject(undefined);
    setName("");
    setLoadedProject(undefined);
  }, [tab]);

  const title = {
    open: "Open project",
    new: "Create new project",
    load: "Load project from disk",
  }[tab];
  const footer = (
    <>
      <label className="flex flex-row gap-2 items-center mr-4">
        <Input
          type="checkbox"
          checked={rememberProjectName}
          onChange={() => setRememberProjectName(!rememberProjectName)}
        />
        Open this project next time
      </label>
      <Button
        className={clsx("w-24", !isValid && "tooltip")}
        disabled={!isValid}
        onClick={handleProject}
        data-tooltip={validationError}
        data-flow="top"
      >
        {!isValid && <TriangleAlert className="text-amber-400" size={16} />}
        {tab === "open" && "Open"}
        {tab === "new" && "Create"}
        {tab === "load" && "Load"}
      </Button>
    </>
  );

  function renderOpenProject() {
    return (
      <div
        className={clsx(
          "flex flex-col flex-wrap justify-start items-start gap-1",
          "w-full h-full overflow-x-auto",
        )}
        onClick={() => setSelectedProject(undefined)}
      >
        {projects.length === 0 && (
          <div className="self-center text-slate-300 italic">
            No projects found
          </div>
        )}
        {projects.map((project) => (
          <div
            className={clsx(
              "w-40 p-1 border-2 border-dotted border-transparent bg-slate-800",
              "hover:bg-slate-700 select-none cursor-default overflow-ellipsis overflow-hidden",
              selectedProject === project && "border-slate-200!",
            )}
            key={project}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedProject(project);
            }}
          >
            {project}
          </div>
        ))}
      </div>
    );
  }

  function renderNewProject() {
    return (
      <label className="flex flex-row gap-4 items-center">
        Name:
        <Input
          type="text"
          placeholder="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
        />
      </label>
    );
  }

  function renderLoadProject() {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-4 items-center">
          <Button
            className="shrink-0"
            onClick={() =>
              loadProject().then((project) => {
                setLoadedProject(project);
                if (project) setName(project[1].project.name);
              })
            }
          >
            Select file
          </Button>
          <div className="overflow-hidden overflow-ellipsis">
            {loadedProject ? loadedProject[0].replace(".ncmapedits", "") : ""}
          </div>
        </div>
        {loadedProject && (
          <React.Fragment key={loadedProject[0]}>
            <div className="border-b-slate-500 border-b" />
            <div>
              <label className="flex flex-row gap-4 items-center">
                Load as:
                <Input
                  type="text"
                  placeholder="Project name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                />
              </label>
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }

  return (
    <Modal className="w-auto!" title={title} footer={footer}>
      <div className="flex flex-row">
        <div className="flex flex-col pt-4 gap-0.5 -mr-[0.667px]">
          {tabs.map((button) => (
            <Button
              key={button.key}
              className={clsx(
                "w-20 z-10",
                button.key === tab && "border-r-slate-900",
                button.key !== tab && "border-transparent",
              )}
              onClick={() => setTab(button.key)}
            >
              {button.label}
            </Button>
          ))}
        </div>
        <div className="border border-slate-500 w-[450px] h-72 p-4">
          {tab === "open" && renderOpenProject()}
          {tab === "new" && renderNewProject()}
          {tab === "load" && renderLoadProject()}
        </div>
      </div>
    </Modal>
  );
}

export default ProjectModal;
