import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Add token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type NoteCreate = { title: string; content: string; tags: string[] }

export async function createNote(payload: NoteCreate) {
  try {
    const { data } = await axios.post(`${API_URL}/notes/`, payload)
    return data
  } catch (error) {
    console.error('Error creating note:', error)
    throw error
  }
}

export async function searchNodes(q: string) {
  try {
    if (!q || q.trim().length === 0) {
      return []
    }
    const { data } = await axios.get(`${API_URL}/search/nodes`, { params: { q } })
    return data || []
  } catch (error) {
    console.error('Error searching nodes:', error)
    return []
  }
}

export async function analyzeNote(content: string) {
  try {
    if (!content || content.trim().length < 10) {
      throw new Error('Content too short')
    }
    const { data } = await axios.post(`${API_URL}/analyze/note`, null, {
      params: { content }
    })
    return data
  } catch (error) {
    console.error('Error analyzing note:', error)
    throw error
  }
}

export type Note = {
  id: string
  title: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
}

export async function getNotes(): Promise<Note[]> {
  try {
    const { data } = await axios.get(`${API_URL}/notes/`)
    return data || []
  } catch (error) {
    console.error('Error fetching notes:', error)
    return []
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  try {
    await axios.delete(`${API_URL}/notes/${noteId}`)
  } catch (error) {
    console.error('Error deleting note:', error)
    throw error
  }
}

export type GraphNode = {
  id: string
  label: string
  summary?: string
  tags: string[]
  has_gap: boolean
  level?: number
}

export type GraphLink = {
  source: string
  target: string
  relation: string
}

export type GraphData = {
  nodes: GraphNode[]
  links: GraphLink[]
}

export async function getAllGraph(): Promise<GraphData> {
  try {
    const { data } = await axios.get(`${API_URL}/graph/all`)
    return data || { nodes: [], links: [] }
  } catch (error) {
    console.error('Error fetching graph:', error)
    return { nodes: [], links: [] }
  }
}

export async function updateNode(nodeId: string, node: GraphNode): Promise<GraphNode> {
  try {
    const { data } = await axios.patch(`${API_URL}/graph/nodes/${nodeId}`, node)
    return data
  } catch (error) {
    console.error('Error updating node:', error)
    throw error
  }
}

export async function deleteNode(nodeId: string): Promise<void> {
  try {
    await axios.delete(`${API_URL}/graph/nodes/${nodeId}`)
  } catch (error) {
    console.error('Error deleting node:', error)
    throw error
  }
}

export async function createLink(link: GraphLink): Promise<GraphLink> {
  try {
    const { data } = await axios.post(`${API_URL}/graph/links`, link)
    return data
  } catch (error) {
    console.error('Error creating link:', error)
    throw error
  }
}

export async function deleteNodes(nodeIds: string[]): Promise<void> {
  try {
    await axios.post(`${API_URL}/graph/nodes/batch-delete`, { node_ids: nodeIds })
  } catch (error) {
    console.error('Error deleting nodes:', error)
    throw error
  }
}