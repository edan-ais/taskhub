import { create } from 'zustand';
import type { Task, Division, Tag, Idea, TabName, Person, InboundEmail } from './types';

interface DeleteConfirmation {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface AppState {
  tasks: Task[];
  divisions: Division[];
  tags: Tag[];
  ideas: Idea[];
  people: Person[];
  emails: InboundEmail[];
  activeTab: TabName;
  selectedTask: Task | null;
  searchQuery: string;
  filterAssignee: string | null;
  filterTag: string | null;
  filterDivision: string | null;
  hideCompleted: boolean;
  deleteConfirmation: DeleteConfirmation | null;
  setTasks: (tasks: Task[]) => void;
  setDivisions: (divisions: Division[]) => void;
  setTags: (tags: Tag[]) => void;
  setIdeas: (ideas: Idea[]) => void;
  setPeople: (people: Person[]) => void;
  setEmails: (emails: InboundEmail[]) => void;
  setActiveTab: (tab: TabName) => void;
  setSelectedTask: (task: Task | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterAssignee: (assignee: string | null) => void;
  setFilterTag: (tag: string | null) => void;
  setFilterDivision: (division: string | null) => void;
  setHideCompleted: (hide: boolean) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addIdea: (idea: Idea) => void;
  updateIdea: (id: string, updates: Partial<Idea>) => void;
  removeIdea: (id: string) => void;
  addPerson: (person: Person) => void;
  removePerson: (id: string) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  addTag: (tag: Tag) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  removeTag: (id: string) => void;
  addEmail: (email: InboundEmail) => void;
  updateEmail: (id: string, updates: Partial<InboundEmail>) => void;
  removeEmail: (id: string) => void;
  showDeleteConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  hideDeleteConfirmation: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  tasks: [],
  divisions: [],
  tags: [],
  ideas: [],
  people: [],
  emails: [],
  activeTab: 'home',
  selectedTask: null,
  searchQuery: '',
  filterAssignee: null,
  filterTag: null,
  filterDivision: null,
  hideCompleted: false,
  deleteConfirmation: null,
  setTasks: (tasks) => set({ tasks }),
  setDivisions: (divisions) => set({ divisions }),
  setTags: (tags) => set({ tags }),
  setIdeas: (ideas) => set({ ideas }),
  setPeople: (people) => set({ people }),
  setEmails: (emails) => set({ emails }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedTask: (task) => set({ selectedTask: task }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterAssignee: (assignee) => set({ filterAssignee: assignee }),
  setFilterTag: (tag) => set({ filterTag: tag }),
  setFilterDivision: (division) => set({ filterDivision: division }),
  setHideCompleted: (hide) => set({ hideCompleted: hide }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      selectedTask: state.selectedTask?.id === id ? { ...state.selectedTask, ...updates } : state.selectedTask,
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
    })),
  addIdea: (idea) => set((state) => ({ ideas: [...state.ideas, idea] })),
  updateIdea: (id, updates) =>
    set((state) => ({
      ideas: state.ideas.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),
  removeIdea: (id) =>
    set((state) => ({
      ideas: state.ideas.filter((i) => i.id !== id),
    })),
  addPerson: (person) =>
    set((state) => ({
      people: [...state.people, person],
    })),
  removePerson: (id) =>
    set((state) => ({
      people: state.people.filter((p) => p.id !== id),
    })),
  updatePerson: (id, updates) =>
    set((state) => ({
      people: state.people.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  addTag: (tag) =>
    set((state) => ({
      tags: [...state.tags, tag],
    })),
  updateTag: (id, updates) =>
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTag: (id) =>
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== id),
    })),
  addEmail: (email) =>
    set((state) => ({
      emails: [...state.emails, email],
    })),
  updateEmail: (id, updates) =>
    set((state) => ({
      emails: state.emails.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  removeEmail: (id) =>
    set((state) => ({
      emails: state.emails.filter((e) => e.id !== id),
    })),
  showDeleteConfirmation: (title, message, onConfirm) =>
    set({ deleteConfirmation: { isOpen: true, title, message, onConfirm } }),
  hideDeleteConfirmation: () => set({ deleteConfirmation: null }),
}));
