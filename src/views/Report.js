import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import ReportMap from '../components/ReportMap';
import ReportEditsChart from '../components/ReportEditsChart';
import PanelContainer from '../components/PanelContainer';
import CompletenessStatus from '../components/CompletenessStatus';
import { requestBoundary } from '../state/ReportState';
import numeral from 'numeral';
import { subMonths, format } from 'date-fns';
import upperFirst from 'lodash.upperfirst';

class Report extends Component {
  constructor(props) {
    super(props);
    const { country, aoi } = this.props.match.params;
    this.state = {
      mapZoom: 9
    }
    this.props.getStats(country, aoi);
    this.onMapZoom = this.onMapZoom.bind(this);
  }

  onMapZoom (z) {
    this.setState({
      mapZoom: z
    });
  }

  render() {
    const { country, aoi } = this.props.match.params;
    const { boundaries, stats, domain } = this.props;

    let layer = null;
    if (boundaries.length > 0) {
      layer = boundaries.filter(bnd => {
        return (
          bnd.properties.country === country &&
          bnd.properties.id === aoi
        );
      })[0];
    }

    if (!stats || !domain || !layer) return <div></div>; //FIXME Should return loading indicator

    const {
      buildingResidential,
      buildingResidentialIncomplete,
      duplicateCount,
      totalBuildings,
      untaggedWays,
      population,
      averageCompleteness
    } = stats['building-stats'];

    const timestamp = stats.timestamp;
    const timeBins = stats['time-bins'];

    // Stats calculation
    const numberUntaggedWays = numeral(untaggedWays);
    const numberBuildings = numeral(totalBuildings);
    const numberResidential = numeral(buildingResidential);
    const numberBuildingResidentialIncomplete = numeral(buildingResidentialIncomplete)
    const percentResidentialBuildings = numeral(numberResidential.value() / numberBuildings.value());
    const percentCompleteBuildings = numeral((numberResidential.value() - numberBuildingResidentialIncomplete.value()) / numberBuildings.value());
    const numberDuplicates = numeral(duplicateCount);
    const estimatePopulation = numeral(population)

    // Calculate recent buildings
    // Get only the bins in the past 6 months
    const today = new Date();
    let recentEditsFromTimeBins = 0;
    let totalEditsFromTimeBins = 0;
    for (let i = 0; i < 1; i++) {
      const date = subMonths(today, i);
      const key = format(date, 'YYYYMM');
      if (timeBins[key]) {
        recentEditsFromTimeBins += timeBins[key]
      }
    }
    Object.values(timeBins).forEach(timebin => {
      totalEditsFromTimeBins += timebin;
    });
    const percentRecentBuildings = numeral(recentEditsFromTimeBins / totalEditsFromTimeBins);

    return (
      <section className='page__body'>
        <div className='map'>
          {<ReportMap aoi={layer} domain={domain} onZoom={this.onMapZoom} />}
          <PanelContainer>
            <div className='report__panel'>

              <div className='inner'>
                <div className='report__actions'>
                  <Link to="/" className='button button--small button--tertiary-filled link-back'>
                    Report Index
                  </Link>
                  {
                    (layer.properties.hot_export
                      ? <a target="_blank" rel="noopener noreferrer" href={layer.properties.hot_export}
                          className='report-link color-white float-right'>
                          Export data from this report
                        </a>
                      : <div style={{display: "none"}}></div>
                    )
                  }
                </div>
                <div className='report__header'>
                  <div className="report__section-update-date">
                    <p>Updated {format(timestamp, 'MMM. D, YYYY')}</p>
                  </div>
                  <div>
                    <h1 className='report__title'>{upperFirst(aoi)} District</h1>
                    <ul className='report__meta'>
                      <li>{upperFirst(country)}</li>
                      <li>Est. Population {estimatePopulation.format('0,0')}</li>
                    </ul>
                  </div>
                  <div>
                    <div className="report__summary-item">
                      <p>1.<span className="report__summary-item-title">Relative Completeness</span></p>
                      <div className="report__summary-status">
                        <CompletenessStatus completenessPercentage={averageCompleteness} />
                      </div>
                    </div>
                    <div className="report__summary-item">
                      <p>2.<span className="report__summary-item-title">Attribute Completeness</span></p>
                      <div className="report__summary-general">
                        <strong>{numberUntaggedWays.format('0,0')}</strong> untagged closeways
                        / <strong>{percentResidentialBuildings.format('0.00%')}</strong> residential buildings
                      </div>
                    </div>
                    <div className="report__summary-item">
                      <p>3.<span className="report__summary-item-title">Temporal Accuracy</span></p>
                      <div className="report__summary-general">
                        <strong>{percentRecentBuildings.format('0.00%')}</strong> buildings edited last month
                      </div>
                    </div>
                    <div className="report__summary-item">
                      <p>4.<span className="report__summary-item-title">Data Errors</span></p>
                      <div className="report__summary-general">
                        <span className="white-bg-text">{numberDuplicates.format('0,0')}</span> data errors
                      </div>
                    </div>
                  </div>
                </div>
                <div className='report__body'>
                  <div id="section-1" className='report__section'>
                    <div className='report__section-header'>
                      <h3 className='section__number'>Section 1</h3>
                      <h2 className='report__section-title'>Relative Completeness</h2>
                      <p className='report__section-description'>Distribution of buildings in OpenStreetMap compared population estimates from WorldPop.</p>
                    </div>
                    <div className='report__section-body'>
                      <CompletenessStatus completenessPercentage={averageCompleteness} />
                    </div>
                  </div>

                  <div id="section-2" className='report__section'>
                    <div className='report__section-header'>
                      <h3 className='section__number'>Section 2</h3>
                      <h2 className='report__section-title'>Attribute Completeness</h2>
                      <p className='report__section-description'>Metadata about use of building, roof and wall type. Using `buildings=residential`, `roof=*` and `wall=*` attributes. </p>
                    </div>
                    <div className='report__section-body'>
                      <p>{numberBuildings.format('0,0')}<small>OSM buildings in this AOI</small></p>
                      <ul className='stat-list'>
                        <li>{numberUntaggedWays.format('0,0')}<small>untagged closeways</small></li>
                        <li>{percentResidentialBuildings.format('0.00%')}<small>residential buildings</small></li>
                        <li>{percentCompleteBuildings.format('0.00%')}<small>residential buildings with roof and wall tags</small></li>
                      </ul>
                    </div>
                  </div>

                  <div id="section-3" className='report__section'>
                    <div className='report__section-header'>
                      <h3 className='section__number'>Section 3</h3>
                      <h2 className='report__section-title'>Temporal Accuracy</h2>
                      <p className='report__section-description'>Recency of building data, and the distribution over the last few years.</p>
                    </div>
                    <div className='report__section-body'>
                      <ul className='stat-list'>
                        <li>{percentRecentBuildings.format('0.00%')}<small>buildings edited in the last 6 months</small></li>
                        <li className='section-button note'>Zoom into map to see OSM buildings and edit recency.</li>
                      </ul>
                      <div className='chart-container'>
                        <h3 className='chart-title'>Buildings Edited by Month </h3>
                        <ReportEditsChart timeBins={timeBins} />
                      </div>
                    </div>
                  </div>

                  <div id="section-4" className='report__section'>
                    <div className='report__section-header'>
                      <h3 className='section__number'>Section 4</h3>
                      <h2 className='report__section-title'>Data Errors</h2>
                      <p className='report__section-description'>Buildings that are potentially overlapping causing overestimation.</p>
                    </div>
                    <div className='report__section-body'>
                      <ul className='stat-list'>
                        <li>{numberDuplicates.format('0,0')}<small>duplicate buildings</small></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PanelContainer>
        </div>
        <div className='map__legend'>
          <div className='color-scale__container'>
              <p className='legend-label'>Completeness</p>
              <ul className='color-scale'>
                <li className='color-scale__item'></li>
                <li className='color-scale__item'></li>
                <li className='color-scale__item'></li>
                <li className='color-scale__item'></li>
                <li className='color-scale__item'></li>
                <li className='color-scale__item'></li>
                <li className='color-scale__item'></li>
                <li className='color-scale__item'></li>
              </ul>
              <div className='scale-labels'>
                <p className='scale-number-bad less'>Bad</p>
                <p className='scale-number-good more'>Good</p>
              </div>
          </div>
          {
            (this.state.mapZoom > 12) ?
            <div className='recency-scale__container'>
              <p className='legend-label'>OSM Edit Recency</p>
              <div className='legend-bar legend-bar-osm'></div>
            </div>
            : <div></div>

          }
        </div>
      </section >
    );
  }
}

const mapStateToProps = (state) => {
  return {
    boundaries: state.AppState.boundaries,
    stats: state.ReportState.stats,
    domain: state.ReportState.domain
  }
}

const mapDispatchToProps = dispatch => {
  return {
    getStats: (...args) => dispatch(requestBoundary(...args))
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Report);
