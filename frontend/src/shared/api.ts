import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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


