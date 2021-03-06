import React, { useState, useEffect } from 'react';
import { Link, Redirect } from 'react-router-dom';

import DashboardEvents from '../components/DashboardEvents';
import DashboardUsers from '../components/DashboardUsers';

import useAuth from '../hooks/useAuth';

import '../sass/Dashboard.scss';

import { round } from 'mathjs';

const AdminDashboard = (props) => {
    const [brigades, setBrigades] = useState([]);
    const [events, setEvents] = useState([]);
    const [nextEvent, setNextEvent] = useState([]);
    const [isCheckInReady, setIsCheckInReady] = useState();
    const [brigade, setBrigade] = useState("All");
    const [checkIns, setCheckIns] = useState(null);
    const [volunteers, setVolunteers] = useState(null);
    const [totalVolunteers, setTotalVolunteers] = useState(null);
    const [satisfiedVolunteers, setSatisfiedVolunteers] = useState(null);
    const [dtlaEvents, setDtlaEvents] = useState(null);
    const [westsideEvents, setWestsideEvents] = useState(null);
    const [users, setUsers] = useState([]);
    const [tabSelected, setTabSelected] = useState();
    const [optionSelected, setOptionSelected] = useState("left");
    const [eventsIsSelected, setEventsIsSelected] = useState(false);
    const [usersIsSelected, setUsersIsSelected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const auth = useAuth();

    async function getAndSetBrigadeEvents() {
        try {
            const events = await fetch('/api/events');
            const eventsJson = await events.json();

            const hackNights = eventsJson.map(event => {
                const { hacknight, _id } = event;
                return { hacknight, _id };
            });



            const dtlaEvents = hackNights.filter(event => {
                return event.hacknight === "DTLA";
            });

            setDtlaEvents(dtlaEvents);

            const westsideEvents = hackNights.filter(event => {
                return event.hacknight === "Westside";
            });

            setWestsideEvents(westsideEvents);


            console.log(hackNights);
            console.log(dtlaEvents);
            console.log(westsideEvents);

        } catch(error) {
            console.log(error);
        }
    }

    async function getCheckIns() {
        try {
            const checkIns = await fetch('/api/checkins');
            const checkInsJson = await checkIns.json();

            setCheckIns(checkInsJson);
        } catch(error) {
            console.log(error);
        }
    }

    async function getUsers() {
        try {
            const users = await fetch('/api/users');
            const usersJson = await users.json();

            setVolunteers(usersJson);
            setTotalVolunteers(usersJson);
        } catch(error) {
            console.log(error);
        }
    }

    async function getNextEvent() {
        try {
            const events = await fetch('/api/events');
            const eventsJson = await events.json();

            const dates = eventsJson.map(event => {
                return Date.parse(event.date);
            });

            const nextDate = new Date(Math.max.apply(null, dates));
            const nextDateUtc = new Date(nextDate).toISOString();

            const nextEvent = eventsJson.filter(event => {
                const eventDate = new Date(event.date).toISOString();
                return eventDate === nextDateUtc;
            });

            setIsCheckInReady(nextEvent[0].checkInReady);
            setNextEvent(nextEvent);

        } catch(error) {
            // setIsError(error);
            // setIsLoading(!isLoading);
            console.log(error);
        }
    }

    async function setCheckInReady(e, nextEventId) {
        e.preventDefault();
        
        try {
            await fetch(`/api/events/${nextEventId}`, {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json"
                }
            })
                .then(response => {
                    if (response.ok) {
                        setIsCheckInReady(!isCheckInReady);
                    }
                });

        } catch(error) {
            // setIsError(error);
            // setIsLoading(!isLoading);
        }
    }

    const handleTabSelect = (e, selectedType) => {
        e.preventDefault();

        if(selectedType === "events") {
            setTabSelected("events");
            setUsersIsSelected(false);
            setEventsIsSelected(true);
        }

        if(selectedType === "users") {
            setTabSelected("users");
            setEventsIsSelected(false);
            setUsersIsSelected(true);
        }
    }

    const handleOptionSelect = (e, selectedType) => {
        e.preventDefault();

        if(selectedType === "left") {
            setOptionSelected("left");
            
        }

        if(selectedType === "right") {
            setOptionSelected("right");
            
        }
    }

    const totalHours = (checkIns !== null) && (checkIns.length)*3; // assuming 3 hours per hack night event (per check-in)

    const avgHoursPerVol = (totalVolunteers !== null) && (round((totalHours/totalVolunteers.length) * 100) / 100).toFixed(2);

    const handleBrigadeChange = (e) => {
        setBrigade(e.currentTarget.value);

        if (e.currentTarget.value === "DTLA") {
            let dtlaVolunteersArray = [];

            for (let eventCount = 0; eventCount < dtlaEvents.length; eventCount++) {
                const dtlaVolunteers = checkIns.filter(checkIn => {
                    return checkIn.eventId === dtlaEvents[eventCount]._id;
                });

                dtlaVolunteersArray.push(dtlaVolunteers);
            }

            const flattenedArray = [].concat(...dtlaVolunteersArray);

            const uniqueVolunteers = Array.from(new Set(flattenedArray.map(volunteer => volunteer.userId)));

            setVolunteers(uniqueVolunteers);
        }

        if (e.currentTarget.value === "Westside") {
            let westsideVolunteersArray = [];

            for (let eventCount = 0; eventCount < westsideEvents.length; eventCount++) {
                const westsideVolunteers = checkIns.filter(checkIn => {
                    return checkIn.eventId === westsideEvents[eventCount]._id;
                });

                westsideVolunteersArray.push(westsideVolunteers);
            }

            const flattenedArray = [].concat(...westsideVolunteersArray);

            const uniqueVolunteers = Array.from(new Set(flattenedArray.map(volunteer => volunteer.userId)));

            setVolunteers(uniqueVolunteers);
        }

        if (e.currentTarget.value === "All") {
            // const usersToCount = checkIns.filter((checkIn, index) => {
            //     return checkIns.indexOf(checkIn) === index;
            // });

            setVolunteers(totalVolunteers);
        }
    };

    const handleSatisfiedChange = (e) => {
        if (e.currentTarget.value === "DTLA") {
            const satisfiedVolunteers = totalVolunteers.filter(volunteer => {
                return volunteer.currentRole === volunteer.desiredRole;
            });

            setSatisfiedVolunteers(satisfiedVolunteers);
        }
    }

    const brigadeSelection = ["All", "DTLA", "Westside"];

    useEffect(() => {
        getAndSetBrigadeEvents();
        getNextEvent();
        getUsers();
        getCheckIns();
    }, []);

    return (
        auth.user ? (
            <div className="flex-container">
                <div className="dashboard">
                    <div className="dashboard-headers">
                        <h3>Hi, {auth.user.name.firstName}</h3>
                    </div>
            
                    {nextEvent[0] ? (
                        <>
                            <div className="dashboard-warning">
                                <p>You have an event coming up:</p>
                            </div>
                            
                            <div className="warning-event">
                                <div className="warning-event-headers">
                                    <h4>{nextEvent[0].name}</h4>
                                    <p>{nextEvent[0].date}</p>
                                </div>
                                <div className="warning-event-toggle">
                                    {nextEvent[0] && isCheckInReady === false ? 
                                        (
                                            <Link 
                                                to={`/events/${nextEvent[0]._id}`}
                                                className="dashboard-nav-button fill-green"
                                                onClick={e => setCheckInReady(e, nextEvent[0]._id)}>
                                                    OPEN CHECK-IN
                                            </Link>
                                        ) : (
                                            <Link 
                                                to={`/events/${nextEvent[0]._id}`}
                                                className="dashboard-nav-button fill-red"
                                                onClick={e => setCheckInReady(e, nextEvent[0]._id)}>
                                                    CLOSE CHECK-IN
                                            </Link>
                                        )
                                    }
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>No events coming up!</div>
                    )}

                    <div className="dashboard-stats">
                        <div className="dashboard-stat-container">
                            <div className="stat">
                                <h5>Total Volunteers:</h5>

                                <form className="form-stats" autoComplete="off" onSubmit={e => e.preventDefault()}>
                                    <div className="stats-form-row">
                                        <div className="form-input-text">
                                            <div className="stat-select">
                                                <select 
                                                    name={"whichBrigade"}
                                                    value={brigade}
                                                    // aria-label="topic"
                                                    onChange={handleBrigadeChange}
                                                    required
                                                >
                                                {brigadeSelection.map((brigade, index) => {
                                                    return <option key={index} value={brigade}>{brigade}</option>
                                                })} 
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="stat-number">
                                <p>{volunteers !== null && volunteers.length}</p>
                            </div>
                        </div> 
                    </div>
                    <div className="dashboard-stats">
                        <div className="dashboard-stat-container">
                            <div className="stat">
                                <h5>Total Hours Volunteered:</h5>
                            </div>
                            <div className="stat-number">
                                <p>{totalHours}</p>
                            </div>
                        </div>
                    </div>
                    <div className="dashboard-stats">
                        <div className="dashboard-stat-container">
                            <div className="stat">
                                <h5>Average Hours Per Volunteer:</h5>
                            </div>
                            <div className="stat-number">
                                <p>{avgHoursPerVol}</p>
                            </div>
                        </div>
                    </div>
                    {/* <div className="dashboard-stats">
                        <div className="dashboard-stat-container">
                            <div className="stat">
                                <h5>Current Role = Desired Role</h5>

                                <form className="form-stats" autoComplete="off" onSubmit={e => e.preventDefault()}>
                                    <div className="stats-form-row">
                                        <div className="form-input-text">
                                            <div className="stat-select">
                                                <select 
                                                    name={"whichBrigade"}
                                                    value={brigade}
                                                    // aria-label="topic"
                                                    onChange={handleSatisfiedChange}
                                                    required
                                                >
                                                {brigadeSelection.map((brigade, index) => {
                                                    return <option key={index} value={brigade}>{brigade}</option>
                                                })} 
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="stat-number">
                                <p>{satisfiedVolunteers !== null && satisfiedVolunteers.length}</p>
                            </div>
                        </div> 
                    </div> */}

                        {/* <div className="dashboard-stat-container">
                            <p>Total Check-Ins:</p>

                            <div>{checkIns !== null && checkIns.length}</div>

                            <form className="form-stats" autoComplete="off" onSubmit={e => e.preventDefault()}>
                                <div className="form-row">
                                    <div className="form-input-text">
                                        <div className="select-reason">
                                            <select 
                                                name={"whichBrigade"}
                                                value={brigade}
                                                // aria-label="topic"
                                                onChange={handleBrigadeChange}
                                                required
                                            >
                                            {brigades.map((brigade, index) => {
                                                return <option key={index} value={brigade}>{brigade}</option>
                                            })} 
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>  */}

                    <div className="dashboard-nav">
                        {events && users ? (
                            <div className="dashboard-nav-row">
                                <button
                                    className={`dashboard-nav-button ${events && tabSelected === "events" ? `tab-selected`: ""}`}
                                    onClick={e => handleTabSelect(e, "events")}
                                >
                                    EVENTS
                                </button>
                                <button
                                    className={`dashboard-nav-button ${users && tabSelected === "users" ? `tab-selected`: ""}`}
                                    onClick={e => handleTabSelect(e, "users")}
                                >
                                    BRIGADE
                                </button>
                            </div>
                        ) : (
                            <div className="dashboard-nav-row block">
                                <button
                                    className="dashboard-nav-button"
                                >
                                    LOADING...
                                </button>
                                <button
                                    className="dashboard-nav-button"
                                >
                                    LOADING...
                                </button>
                            </div> 
                        )}

                        {!eventsIsSelected && !usersIsSelected ? (
                            <div className="eventsandusers-container">
                            <h4> ^ Select an option above to get started.</h4>
                            </div>
                        ) : (
                            null
                        )}

                        {tabSelected ? (
                            <div className="plus-sign">
                                +
                            </div>
                        ) : (
                            null
                        )}
                        
                        {eventsIsSelected ? (
                            <div className="dashboard-nav-row">
                                <button 
                                    className={`dashboard-nav-button ${events && optionSelected === "left" ? `tab-selected`: ""}`}
                                    onClick={e => handleOptionSelect(e, "left")}
                                >
                                    UPCOMING
                                </button>
                                <button
                                    className={`dashboard-nav-button ${events && optionSelected === "right" ? `tab-selected`: ""}`}
                                    onClick={e => handleOptionSelect(e, "right")}
                                >
                                    PAST
                                </button>
                            </div>
                        ) : (
                            null
                        )}

                        {usersIsSelected ? (
                            <div className="dashboard-nav-row">
                                <button 
                                    className={`dashboard-nav-button ${events && optionSelected === "left" ? `tab-selected`: ""}`}
                                    onClick={e => handleOptionSelect(e, "left")}
                                >
                                    NAME
                                </button>
                                <button
                                    className={`dashboard-nav-button ${events && optionSelected === "right" ? `tab-selected`: ""}`}
                                    onClick={e => handleOptionSelect(e, "right")}
                                >
                                    ROLE
                                </button>
                            </div>
                        ) : (
                            null
                        )}
                    </div>
                    

                    {eventsIsSelected ? (
                        <div className="eventsandusers-container">
                            <DashboardEvents />
                        </div> 
                    ) : (
                        null
                    )}

                    {usersIsSelected ? (
                        <div className="eventsandusers-container">
                            <DashboardUsers />
                        </div> 
                    ) : (
                        null
                    )}
                </div>
            </div>
        ) : (
            <Redirect to="/login" />
        )
    )
};

export default AdminDashboard;
    