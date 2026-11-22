import { BASE_URL } from '@/utils/environment-util';
import { fetchJsonArrayOrThrow } from '@/lib/api-response';
import { Resource } from '@shared/resource';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

interface ResourceContextType {
  currentResource: Resource | null;
  isEditing: boolean;
  isLoadingResources: boolean;
  isSubmitting: boolean;
  resources: Resource[];
  getResourceById: (id?: string) => Resource | undefined;
  setResources: Dispatch<SetStateAction<Resource[]>>;
  setCurrentResource: (resource: Resource | null) => void;
  setIsEditing: (isEditing: boolean) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  addResource: (resource: Resource) => Promise<void>;
  updateResource: (resource: Resource) => Promise<void>;
  deleteResource: (resource: Resource) => Promise<void>;
}

const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

export const ResourceProvider = ({ children }: { children: ReactNode }) => {
  const [currentResource, setCurrentResource] = useState<Resource | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);

  const getResourceById = useCallback(
    (id?: string) => {
      return resources.find(x => x._id === id);
    },
    [resources]
  );

  const queryClient = useQueryClient();

  const { mutateAsync: deleteResource } = useMutation({
    mutationFn: async (resource: Resource) => {
      setResources(prev => {
        return prev.filter(x => x._id !== resource._id);
      });

      const response = await fetch(`${BASE_URL}/api/resources/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resource),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Failed to delete resource'));
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const { mutateAsync: addResource } = useMutation({
    mutationFn: async (resource: Resource) => {
      const response = await fetch(`${BASE_URL}/api/resources/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resource),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Failed to create technician'));
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const { data, isLoading } = useQuery<Resource[]>({
    queryKey: ['resources'],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/resources/get-all`, { credentials: 'include' });
      return fetchJsonArrayOrThrow<Resource>(response, 'Failed to load technicians');
    },
  });

  useEffect(() => {
    if (data) setResources(data);
  }, [data]);

  const { mutateAsync: updateResource } = useMutation({
    mutationFn: async (resource: Resource) => {
      setResources(prev => {
        const next = prev.map(x => {
          if (x._id === resource._id) {
            return { ...x, ...resource };
          }
          return x;
        });
        queryClient.setQueryData<Resource[]>(['resources'], next);
        return next;
      });

      const response = await fetch(`${BASE_URL}/api/resources/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resource),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Failed to update technician'));
      }

      return await response.json();
    },
  });

  return (
    <ResourceContext.Provider
      value={{
        currentResource,
        isEditing,
        isSubmitting,
        resources,
        isLoadingResources: isLoading,
        setResources,
        getResourceById,
        setCurrentResource,
        setIsEditing,
        setIsSubmitting,
        addResource,
        updateResource,
        deleteResource,
      }}
    >
      {children}
    </ResourceContext.Provider>
  );
};

export const useResourceContext = () => {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error('useResourceContext must be used within a ResourceProvider');
  }
  return context;
};
