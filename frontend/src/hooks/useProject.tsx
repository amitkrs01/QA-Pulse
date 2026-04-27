import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import api from "../lib/api";
import type { Project } from "../lib/types";
import { useAuth } from "./useAuth";

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  switchProject: (projectId: string) => void;
  refreshProjects: () => Promise<void>;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setCurrentProject(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/projects");
      setProjects(data);

      const savedId = localStorage.getItem("qa_pulse_project");
      const saved = data.find((p: Project) => p.id === savedId);

      if (saved) {
        setCurrentProject(saved);
      } else if (data.length > 0) {
        setCurrentProject(data[0]);
        localStorage.setItem("qa_pulse_project", data[0].id);
      } else {
        setCurrentProject(null);
      }
    } catch {
      setProjects([]);
      setCurrentProject(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const switchProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      localStorage.setItem("qa_pulse_project", projectId);
    }
  };

  return (
    <ProjectContext.Provider value={{ projects, currentProject, switchProject, refreshProjects, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
