import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error: error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:40,textAlign:'center',fontFamily:'system-ui'}}>
          <h2 style={{marginBottom:12}}>Something went wrong</h2>
          <p style={{color:'#888',marginBottom:20}}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={function(){ window.location.reload() }}
            style={{padding:'10px 24px',background:'#C8102E',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:14}}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
