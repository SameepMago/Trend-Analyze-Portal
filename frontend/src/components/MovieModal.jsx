import React from 'react';
import { X, Star, Calendar, Clock, Users, Film, Tv, Loader2 } from 'lucide-react';

const MovieModal = ({ 
  selectedMovie, 
  movieDetails, 
  onClose 
}) => {
  if (!selectedMovie) return null;

  console.log('MovieModal rendering - selectedMovie:', selectedMovie);
  console.log('MovieModal rendering - movieDetails:', movieDetails);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="movie-details">
          {!movieDetails ? (
            // Loading state
            <div className="modal-loading">
              <div className="loading-content">
                <div style={{fontSize: '2rem', marginBottom: '1rem'}}>🔄</div>
                <h2>Loading movie details...</h2>
                <p>Fetching information from TMDB</p>
                <p style={{fontSize: '0.8rem', color: '#999'}}>DEBUG: movieDetails is null</p>
              </div>
            </div>
          ) : (
            // Content state
            <>
              <div className="movie-poster">
                <img 
                  src={movieDetails ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}` : 'https://via.placeholder.com/300x450/333/fff?text=No+Image'}
                  alt={selectedMovie.title}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x450/333/fff?text=No+Image';
                  }}
                />
              </div>
              
              <div className="movie-info">
                <h2 className="movie-title">{movieDetails?.title || selectedMovie.title}</h2>
                
                <div className="movie-meta">
                  <div className="release-date">
                    <Calendar className="meta-icon" />
                    <span>
                      {movieDetails?.release_date?.split('-')[0] || 
                       movieDetails?.first_air_date?.split('-')[0] || 
                       selectedMovie.release_year}
                    </span>
                  </div>
                  <div className="program-type">
                    {selectedMovie.program_type === 'movie' ? (
                      <Film className="meta-icon" />
                    ) : (
                      <Tv className="meta-icon" />
                    )}
                    <span>{selectedMovie.program_type === 'movie' ? 'Movie' : 'TV Show'}</span>
                  </div>
                  {movieDetails && movieDetails.vote_average && (
                    <div className="rating">
                      <Star className="rating-icon" />
                      <span>{movieDetails.vote_average}/10</span>
                    </div>
                  )}
                  {movieDetails && movieDetails.runtime && (
                    <div className="runtime">
                      <Clock className="meta-icon" />
                      <span>{movieDetails.runtime} min</span>
                    </div>
                  )}
                </div>
                
                {/* ID Information */}
                <div className="id-information">
                  <h3>Identifiers</h3>
                  <div className="id-list">
                    {selectedMovie.imdb_id && (
                      <div className="id-item">
                        <span className="id-label">IMDB ID:</span>
                        <span className="id-value">{selectedMovie.imdb_id}</span>
                      </div>
                    )}
                    {selectedMovie.topic_id && (
                      <div className="id-item">
                        <span className="id-label">Topic ID:</span>
                        <span className="id-value">{selectedMovie.topic_id}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {movieDetails && movieDetails.overview && (
                  <div className="movie-overview">
                    <h3>Overview</h3>
                    <p>{movieDetails.overview}</p>
                  </div>
                )}
                
                {movieDetails && movieDetails.genres && movieDetails.genres.length > 0 && (
                  <div className="genres">
                    <h3>Genres</h3>
                    <div className="genres">
                      {movieDetails.genres.map((genre, index) => (
                        <span key={index} className="genre-tag">
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {movieDetails && movieDetails.production_companies && movieDetails.production_companies.length > 0 && (
                  <div className="production">
                    <h3>Production</h3>
                    <div className="production">
                      {movieDetails.production_companies.map((company, index) => (
                        <span key={index} className="production-company">
                          {company.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {movieDetails && movieDetails.credits && (
                  <div className="movie-cast-crew">
                    {movieDetails.credits.cast && movieDetails.credits.cast.length > 0 && (
                      <div className="cast-section">
                        <h3 className="cast-title">
                          <Users className="cast-section-icon" />
                          Cast
                        </h3>
                        <div className="cast-grid">
                          {movieDetails.credits.cast.slice(0, 6).map((person, index) => (
                            <div key={index} className="cast-member">
                              <div className="cast-photo">
                                {person.profile_path ? (
                                  <img 
                                    src={`https://image.tmdb.org/t/p/w200${person.profile_path}`}
                                    alt={person.name}
                                    onError={(e) => {
                                      e.target.parentNode.innerHTML = `
                                        <div class="cast-no-photo">
                                          <div class="user-avatar">
                                            <span class="user-initial">${person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                                          </div>
                                        </div>
                                      `;
                                    }}
                                  />
                                ) : (
                                  <div className="cast-no-photo">
                                    <div className="user-avatar">
                                      <span className="user-initial">
                                        {person.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="cast-info">
                                <div className="cast-name">{person.name}</div>
                                <div className="cast-character">{person.character}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {movieDetails.credits.crew && movieDetails.credits.crew.length > 0 && (
                      <div className="crew-section">
                        <h3 className="crew-title">
                          <Film className="cast-section-icon" />
                          Crew
                        </h3>
                        <div className="crew-list">
                          {movieDetails.credits.crew.slice(0, 5).map((person, index) => (
                            <div key={index} className="crew-member">
                              <div className="crew-name">{person.name}</div>
                              <div className="crew-job">{person.job}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieModal;