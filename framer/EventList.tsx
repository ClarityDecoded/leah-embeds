import React from "react"
import { addPropertyControls, ControlType, motion, RenderTarget } from "framer"

/* ============================================================================
   Event List — now remotely controllable.

   Set the "Data Source URL" property (in Framer) to a hosted JSON file and this
   component loads its events from there instead of the in-Framer Events array.
   That makes the whole page editable by changing ONE file + pushing — no Framer.

   Live data file:
     https://claritydecoded.github.io/leah-embeds/events-data.json
   Edit it in the leah-embeds repo (events-data.json), commit, push. The page
   updates on next load. If the URL is empty or the fetch fails, the component
   falls back to the Events array typed into Framer below.

   Each occurrence can now carry an optional venue line (sublabel) and its own
   Register link (url) — that's what renders the book-tour date rail.
   ========================================================================== */

interface Occurrence {
    date: string
    label?: string      // e.g. a city ("Sisters, OR") or "Full Moon"
    sublabel?: string   // optional venue · time line under the label
    url?: string        // optional per-row Register link
    highlight?: boolean
}

interface EventProps {
    name: string
    description: string
    start: string
    end: string
    hideAfter: string
    startDate?: string
    startTime?: string
    endDate?: string
    endTime?: string
    customDateTimeString: string
    useCustomDateTime: boolean
    occurrences?: Occurrence[]
    image: {
        src: string
        srcSet?: string
        alt?: string
    }
    timeText?: string
    learnMoreUrl?: string
    registerNowUrl?: string
    ctaLabel?: string
}

interface FontSettings {
    family: string
    weight: number
    fontSize: number
    lineHeight: number
}

interface EventListProps {
    dataSourceUrl: string
    events: EventProps[]
    eyebrow: string
    sectionTitle: string
    fontColor: string
    accentColor: string
    linkColor: string
    headerColor: string
    dividerColor: string
    imageFrameColor: string
    eyebrowFont: FontSettings
    headerFont: FontSettings
    titleFont: FontSettings
    bodyFont: FontSettings
    dateFont: FontSettings
    buttonFont: FontSettings
    timeSuffix: string
    showDebug: boolean
}

/* ---- date helpers: prefer the new picker value, fall back to legacy text ---- */

const parseDateParts = (iso: string): Date | null => {
    if (!iso) return null
    // Use only the calendar date (YYYY-MM-DD) and build a LOCAL date, so the
    // day never shifts by timezone and the picker's time is never shown.
    const [y, m, d] = iso.split("T")[0].split("-").map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
}

const getStartDate = (e: EventProps): Date | null =>
    parseDateParts(e.start || e.startDate || "")

const getEndDate = (e: EventProps): Date | null =>
    parseDateParts(e.end || e.endDate || "")

const getHideAfter = (e: EventProps): Date | null => {
    if (e.hideAfter) return new Date(e.hideAfter.replace(" ", "T"))
    return null
}

const isValid = (d: Date | null): d is Date =>
    d instanceof Date && !isNaN(d.getTime())

// Links to a DIFFERENT site open in a new tab; same-site links navigate in
// place. Returns the target/rel props to spread onto an <a>.
const linkTargetAttrs = (href?: string) => {
    if (!href) return {}
    try {
        const u = new URL(href, window.location.href)
        if (u.hostname && u.hostname !== window.location.hostname) {
            return { target: "_blank", rel: "noopener noreferrer" }
        }
    } catch (_) {}
    return {}
}

const startOfToday = (): Date => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
}

// Future dates for a multi-date event, sorted, with past ones removed.
const getFutureOccurrences = (e: EventProps) => {
    const today = startOfToday().getTime()
    return (e.occurrences || [])
        .map((o) => ({
            label: o.label,
            sublabel: o.sublabel,
            url: o.url,
            highlight: o.highlight,
            d: parseDateParts(o.date),
        }))
        .filter((o) => isValid(o.d) && (o.d as Date).getTime() >= today)
        .sort((a, b) => (a.d as Date).getTime() - (b.d as Date).getTime())
}

const monthDay = (d: Date): string =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric" })

const weekdayShort = (d: Date): string =>
    d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()

const monthDayShort = (d: Date): string =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()

const dateLabel = (e: EventProps, suffix: string): string => {
    if (e.useCustomDateTime) return e.customDateTimeString || ""

    const start = getStartDate(e)
    if (!isValid(start)) return ""

    let label = monthDay(start)

    const end = getEndDate(e)
    if (isValid(end) && monthDay(end) !== monthDay(start)) {
        const sameMonth = start.getMonth() === end.getMonth()
        label = `${label} – ${sameMonth ? end.getDate() : monthDay(end)}`
    }

    // Time only appears if you explicitly type one — the date picker never
    // adds a phantom time.
    const time = (e.timeText || "").trim()
    if (time) label = `${label} · ${`${time} ${suffix}`.trim()}`

    return label
}

/* ------------------------------ event row ------------------------------ */

const EventCard: React.FC<{
    event: EventProps
    styles: any
    timeSuffix: string
}> = ({ event, styles, timeSuffix }) => {
    const { name, description, image, learnMoreUrl, registerNowUrl, ctaLabel } =
        event

    const label = dateLabel(event, timeSuffix)
    const occurrences = getFutureOccurrences(event)
    const hasSchedule = occurrences.length > 0

    // On the Framer canvas, whileInView never fires, so skip the hidden-until-
    // scrolled state there — otherwise events look invisible while editing.
    const onCanvas = RenderTarget.current() === RenderTarget.canvas
    const motionProps = onCanvas
        ? {}
        : {
              initial: { opacity: 0, y: 24 },
              whileInView: { opacity: 1, y: 0 },
              viewport: { once: true, margin: "-40px" },
              transition: { duration: 0.5 },
          }

    // Every event uses the same row: image on the left, text/schedule to the
    // right. Single events also get a Register button in the far-right column.
    const rowStyle: React.CSSProperties = {
        display: "flex",
        gap: "48px",
        alignItems: "flex-start",
        padding: "48px 0",
    }

    const imageFrameStyle: React.CSSProperties = {
        flex: "0 0 auto",
        width: "clamp(240px, 34%, 340px)",
        background: styles.imageFrameColor,
        padding: "18px",
        boxSizing: "border-box",
    }

    // Square frame, cropped to fill — keeps every event's image a consistent tile.
    const imageStyle: React.CSSProperties = {
        width: "100%",
        aspectRatio: "1 / 1",
        display: "block",
        objectFit: "cover",
    }

    const contentStyle: React.CSSProperties = {
        flex: "1 1 auto",
        minWidth: 0,
    }

    const dateStyle: React.CSSProperties = {
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: styles.accentColor,
        margin: "0 0 14px 0",
        ...styles.dateFont,
    }

    const titleStyle: React.CSSProperties = {
        color: styles.headerColor,
        margin: "0 0 14px 0",
        ...styles.titleFont,
    }

    const descStyle: React.CSSProperties = {
        color: styles.fontColor,
        margin: "0 0 22px 0",
        maxWidth: "48ch",
        ...styles.bodyFont,
    }

    const learnMoreStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "6px",
        color: styles.linkColor,
        textDecoration: "none",
        ...styles.buttonFont,
    }

    const pillBase: React.CSSProperties = {
        display: "inline-block",
        borderRadius: "999px",
        padding: "9px 20px",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        textDecoration: "none",
        ...styles.buttonFont,
    }

    // Register sits in a fixed right-hand column so every event's Register
    // button lines up on the right edge (matching the per-row tour buttons).
    const regColStyle: React.CSSProperties = {
        flex: "0 0 auto",
        width: "clamp(130px, 16%, 164px)",
        display: "flex",
        justifyContent: "flex-end",
        alignSelf: "center",
    }

    // Multi-date schedule (tour rail / moon-phase) styles.
    const scheduleStyle: React.CSSProperties = {
        margin: "6px 0 26px 0",
    }

    const occRowStyle: React.CSSProperties = {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "24px",
        padding: "20px 0",
    }

    // The stacked weekday / month-day date block on the left of each row.
    const occDateColStyle: React.CSSProperties = {
        flex: "0 0 auto",
        width: "72px",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        borderRight: `1px solid ${styles.dividerColor}`,
        paddingRight: "18px",
        marginRight: "6px",
    }

    const occWeekdayStyle: React.CSSProperties = {
        ...styles.dateFont,
        color: styles.accentColor,
        letterSpacing: "0.16em",
    }

    const occDayStyle: React.CSSProperties = {
        fontFamily: styles.titleFont?.family,
        fontWeight: styles.titleFont?.weight,
        color: styles.linkColor,
        fontSize: "22px",
        lineHeight: 1.05,
        textTransform: "uppercase",
        letterSpacing: "0.02em",
    }

    const occMainStyle: React.CSSProperties = {
        flex: "1 1 auto",
        minWidth: 0,
    }

    const occCityStyle: React.CSSProperties = {
        fontFamily: styles.titleFont?.family,
        fontWeight: styles.titleFont?.weight,
        color: styles.headerColor,
        fontSize: "20px",
        lineHeight: 1.2,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
    }

    const occVenueStyle: React.CSSProperties = {
        ...styles.bodyFont,
        color: styles.fontColor,
        fontSize: "15px",
        marginTop: "4px",
    }

    const occLabelOnlyStyle: React.CSSProperties = {
        ...styles.dateFont,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        whiteSpace: "nowrap",
    }

    const occRegisterStyle: React.CSSProperties = {
        ...pillBase,
        flex: "0 0 auto",
        border: `1px solid ${styles.linkColor}`,
        color: styles.linkColor,
    }

    const occDividerStyle: React.CSSProperties = {
        border: "none",
        borderTop: `1px solid ${styles.dividerColor}`,
        margin: 0,
    }

    return (
        <motion.article className="ssg-row" style={rowStyle} {...motionProps}>
            {image?.src && (
                <div className="ssg-image" style={imageFrameStyle}>
                    <img
                        src={image.src}
                        srcSet={image.srcSet}
                        alt={image.alt || name}
                        style={imageStyle}
                    />
                </div>
            )}

            <div style={contentStyle}>
                {!hasSchedule && label && <div style={dateStyle}>{label}</div>}
                {name && <h2 style={titleStyle}>{name}</h2>}
                {description && <p style={descStyle}>{description}</p>}

                {hasSchedule && (
                    <div style={scheduleStyle}>
                        {occurrences.map((o, i) => {
                            const d = o.d as Date
                            const hasDetail = !!(o.sublabel || o.url)
                            return (
                                <React.Fragment key={i}>
                                    {i > 0 && <hr style={occDividerStyle} />}
                                    <div
                                        className="ssg-occ"
                                        style={occRowStyle}
                                    >
                                        <div
                                            className="ssg-occ-date"
                                            style={occDateColStyle}
                                        >
                                            <span style={occWeekdayStyle}>
                                                {weekdayShort(d)}
                                            </span>
                                            <span style={occDayStyle}>
                                                {monthDayShort(d)}
                                            </span>
                                        </div>

                                        <div style={occMainStyle}>
                                            {o.label &&
                                                (hasDetail ? (
                                                    <div style={occCityStyle}>
                                                        {o.label}
                                                    </div>
                                                ) : (
                                                    <span
                                                        style={{
                                                            ...occLabelOnlyStyle,
                                                            color: o.highlight
                                                                ? styles.accentColor
                                                                : styles.fontColor,
                                                        }}
                                                    >
                                                        {o.label}
                                                    </span>
                                                ))}
                                            {o.sublabel && (
                                                <div style={occVenueStyle}>
                                                    {o.sublabel}
                                                </div>
                                            )}
                                        </div>

                                        {o.url && (
                                            <a
                                                className="ssg-occ-cta"
                                                href={o.url}
                                                style={occRegisterStyle}
                                                {...linkTargetAttrs(o.url)}
                                            >
                                                Register
                                            </a>
                                        )}
                                    </div>
                                </React.Fragment>
                            )
                        })}
                    </div>
                )}

                {/* Learn more — left column, under the text / schedule. */}
                {learnMoreUrl && (
                    <a
                        href={learnMoreUrl}
                        style={learnMoreStyle}
                        {...linkTargetAttrs(learnMoreUrl)}
                    >
                        <span
                            style={{
                                borderBottom: `1px solid ${styles.linkColor}`,
                                paddingBottom: "2px",
                            }}
                        >
                            Learn more
                        </span>
                        <span>→</span>
                    </a>
                )}
            </div>

            {/* Register — right-hand column (tour events use per-row buttons). */}
            {!hasSchedule && (registerNowUrl || ctaLabel) && (
                <div className="ssg-reg-col" style={regColStyle}>
                    {registerNowUrl ? (
                        <a
                            href={registerNowUrl}
                            style={{
                                ...pillBase,
                                border: `1px solid ${styles.linkColor}`,
                                color: styles.linkColor,
                            }}
                            {...linkTargetAttrs(registerNowUrl)}
                        >
                            {ctaLabel || "Register now"}
                        </a>
                    ) : (
                        <span
                            style={{
                                ...pillBase,
                                border: `1px solid ${styles.dividerColor}`,
                                color: styles.accentColor,
                            }}
                        >
                            {ctaLabel}
                        </span>
                    )}
                </div>
            )}
        </motion.article>
    )
}

/* ------------------------------ list ------------------------------ */

export default function EventList(props: EventListProps) {
    const {
        dataSourceUrl = "",
        events = [],
        eyebrow = "",
        sectionTitle = "Upcoming Gatherings",
        fontColor = "#6B655D",
        accentColor = "#9A8253",
        linkColor = "#9C4A2E",
        headerColor = "#2E2A24",
        dividerColor = "rgba(46,42,36,0.14)",
        imageFrameColor = "#F3EEE2",
        eyebrowFont,
        headerFont,
        titleFont,
        bodyFont,
        dateFont,
        buttonFont,
        timeSuffix = "",
        showDebug = false,
    } = props

    // Remote data source: when a URL is set, events are loaded from that JSON
    // file and REPLACE the in-Framer array. Falls back to props.events if the
    // URL is empty or the fetch fails, so the page never goes blank.
    const [remoteEvents, setRemoteEvents] = React.useState<EventProps[] | null>(
        null
    )

    React.useEffect(() => {
        if (!dataSourceUrl) {
            setRemoteEvents(null)
            return
        }
        let cancelled = false
        // Cache-bust so a freshly pushed edit shows up without a hard refresh.
        const url =
            dataSourceUrl +
            (dataSourceUrl.includes("?") ? "&" : "?") +
            "t=" +
            Math.floor(Date.now() / 60000) // changes once a minute
        fetch(url, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((data) => {
                if (cancelled) return
                const list = Array.isArray(data) ? data : data.events || []
                setRemoteEvents(Array.isArray(list) ? list : [])
            })
            .catch(() => {
                if (!cancelled) setRemoteEvents(null)
            })
        return () => {
            cancelled = true
        }
    }, [dataSourceUrl])

    const sourceEvents = remoteEvents !== null ? remoteEvents : events

    // Computed during render (not in an effect) so it paints immediately,
    // including on the Framer canvas.
    const now = new Date()
    const visibleEvents = (sourceEvents || []).filter((event) => {
        const hideAfter = getHideAfter(event)
        if (isValid(hideAfter) && hideAfter <= now) return false
        // A multi-date event disappears once all of its dates are in the past.
        if (
            (event.occurrences || []).length > 0 &&
            getFutureOccurrences(event).length === 0
        ) {
            return false
        }
        return true
    })

    const styles = {
        fontColor,
        accentColor,
        linkColor,
        headerColor,
        dividerColor,
        imageFrameColor,
        titleFont,
        bodyFont,
        dateFont,
        buttonFont,
    }

    const containerStyle: React.CSSProperties = {
        fontFamily: bodyFont?.family,
        color: fontColor,
        maxWidth: "1040px",
        margin: "0 auto",
        padding: "0 24px",
        boxSizing: "border-box",
    }

    const eyebrowStyle: React.CSSProperties = {
        textAlign: "center",
        textTransform: "uppercase",
        letterSpacing: "0.22em",
        color: accentColor,
        margin: "0 0 12px 0",
        ...eyebrowFont,
    }

    const titleStyle: React.CSSProperties = {
        textAlign: "center",
        color: headerColor,
        margin: "0 0 8px 0",
        ...headerFont,
    }

    const dividerStyle: React.CSSProperties = {
        border: "none",
        borderTop: `1px solid ${dividerColor}`,
        margin: 0,
    }

    return (
        <div style={containerStyle}>
            <style>
                {`
                @media (max-width: 700px) {
                    .ssg-row { flex-direction: column !important; }
                    .ssg-image { flex-basis: auto !important; width: 100% !important; }
                    /* Stack each schedule row: date line, city, venue, button. */
                    .ssg-occ {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 10px !important;
                        padding: 18px 0 !important;
                    }
                    .ssg-occ-date {
                        flex-direction: row !important;
                        align-items: baseline !important;
                        width: auto !important;
                        border-right: none !important;
                        padding-right: 0 !important;
                        margin-right: 0 !important;
                        gap: 10px !important;
                    }
                    .ssg-occ-cta { margin-left: 0 !important; }
                    .ssg-image { max-width: 320px !important; }
                    .ssg-reg-col {
                        width: auto !important;
                        justify-content: flex-start !important;
                        align-self: flex-start !important;
                        margin-top: 4px !important;
                    }
                }
                `}
            </style>

            {eyebrow && <div style={eyebrowStyle}>{eyebrow}</div>}
            {sectionTitle && <h1 style={titleStyle}>{sectionTitle}</h1>}

            {(eyebrow || sectionTitle) && (
                <hr style={{ ...dividerStyle, marginTop: "36px" }} />
            )}

            {visibleEvents.length === 0 ? (
                <p style={{ padding: "40px 0", textAlign: "center" }}>
                    No gatherings scheduled right now.
                </p>
            ) : (
                visibleEvents.map((event, index) => (
                    <React.Fragment key={`${event.name}-${index}`}>
                        <EventCard
                            event={event}
                            styles={styles}
                            timeSuffix={timeSuffix}
                        />
                        <hr style={dividerStyle} />
                    </React.Fragment>
                ))
            )}

            {showDebug && (
                <pre
                    style={{
                        background: "#f0f0f0",
                        padding: "10px",
                        fontSize: "12px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                    }}
                >
                    {JSON.stringify(visibleEvents, null, 2)}
                </pre>
            )}
        </div>
    )
}

EventList.defaultProps = {
    dataSourceUrl: "",
    events: [],
    eyebrow: "School for Sacred Storytelling",
    sectionTitle: "Upcoming Gatherings",
    fontColor: "#6B655D",
    accentColor: "#9A8253",
    linkColor: "#9C4A2E",
    headerColor: "#2E2A24",
    dividerColor: "rgba(46,42,36,0.14)",
    imageFrameColor: "#F3EEE2",
    eyebrowFont: {
        family: "Inter, sans-serif",
        weight: 600,
        fontSize: 12,
        lineHeight: 1.4,
    },
    headerFont: {
        family: "Georgia, 'Times New Roman', serif",
        weight: 400,
        fontSize: 44,
        lineHeight: 1.1,
    },
    titleFont: {
        family: "Georgia, 'Times New Roman', serif",
        weight: 400,
        fontSize: 30,
        lineHeight: 1.15,
    },
    bodyFont: {
        family: "Georgia, 'Times New Roman', serif",
        weight: 400,
        fontSize: 17,
        lineHeight: 1.6,
    },
    dateFont: {
        family: "Inter, sans-serif",
        weight: 600,
        fontSize: 12,
        lineHeight: 1.2,
    },
    buttonFont: {
        family: "Inter, sans-serif",
        weight: 600,
        fontSize: 12,
        lineHeight: 1.2,
    },
    timeSuffix: "",
    showDebug: false,
}

addPropertyControls(EventList, {
    dataSourceUrl: {
        type: ControlType.String,
        title: "Data Source URL",
        defaultValue: "",
        placeholder:
            "https://claritydecoded.github.io/leah-embeds/events-data.json",
        description:
            "When set, events load from this JSON file and replace the array below. Edit that file to update the page.",
    },
    eyebrow: {
        type: ControlType.String,
        title: "Eyebrow",
        defaultValue: "School for Sacred Storytelling",
    },
    sectionTitle: {
        type: ControlType.String,
        title: "Section Title",
        defaultValue: "Upcoming Gatherings",
    },
    events: {
        type: ControlType.Array,
        title: "Events",
        description: "Fallback / used only when Data Source URL is empty.",
        control: {
            type: ControlType.Object,
            controls: {
                name: {
                    title: "Event Name",
                    type: ControlType.String,
                },
                description: {
                    title: "Description",
                    type: ControlType.String,
                    displayTextArea: true,
                },
                useCustomDateTime: {
                    title: "Custom Date Text",
                    type: ControlType.Boolean,
                },
                start: {
                    title: "Start",
                    type: ControlType.Date,
                    hidden: (props) => props.useCustomDateTime,
                },
                end: {
                    title: "End",
                    type: ControlType.Date,
                    hidden: (props) => props.useCustomDateTime,
                },
                timeText: {
                    title: "Time",
                    type: ControlType.String,
                    placeholder: "e.g. 2:00 PM (optional)",
                    optional: true,
                    hidden: (props) => props.useCustomDateTime,
                },
                customDateTimeString: {
                    title: "Date Text",
                    type: ControlType.String,
                    placeholder: "e.g. August 10 & 24",
                    hidden: (props) => !props.useCustomDateTime,
                },
                occurrences: {
                    title: "Dates (multiple)",
                    type: ControlType.Array,
                    description:
                        "For a recurring event or a tour. Past dates drop off automatically.",
                    control: {
                        type: ControlType.Object,
                        controls: {
                            date: {
                                title: "Date",
                                type: ControlType.Date,
                            },
                            label: {
                                title: "Label",
                                type: ControlType.String,
                                placeholder: "e.g. Sisters, OR / Full Moon",
                                optional: true,
                            },
                            sublabel: {
                                title: "Venue line",
                                type: ControlType.String,
                                placeholder: "e.g. Paulina Springs Books · 6–8 pm",
                                optional: true,
                            },
                            url: {
                                title: "Register URL",
                                type: ControlType.String,
                                optional: true,
                            },
                            highlight: {
                                title: "Highlight",
                                type: ControlType.Boolean,
                            },
                        },
                    },
                },
                hideAfter: {
                    title: "Hide After",
                    type: ControlType.Date,
                    description:
                        "Event disappears after this. Leave empty to keep it always.",
                },
                image: {
                    title: "Event Image",
                    type: ControlType.ResponsiveImage,
                },
                learnMoreUrl: {
                    title: "Learn More URL",
                    type: ControlType.String,
                    optional: true,
                },
                registerNowUrl: {
                    title: "Register URL",
                    type: ControlType.String,
                    optional: true,
                },
                ctaLabel: {
                    title: "Button Label",
                    type: ControlType.String,
                    placeholder: "e.g. Registration coming soon",
                    optional: true,
                },
            },
        },
    },
    headerColor: {
        type: ControlType.Color,
        title: "Title Color",
    },
    fontColor: {
        type: ControlType.Color,
        title: "Body Color",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Date / Eyebrow Color",
    },
    linkColor: {
        type: ControlType.Color,
        title: "Link Color",
    },
    dividerColor: {
        type: ControlType.Color,
        title: "Divider Color",
    },
    imageFrameColor: {
        type: ControlType.Color,
        title: "Image Frame Color",
    },
    eyebrowFont: {
        type: ControlType.Font,
        title: "Eyebrow Font",
        controls: "extended",
        displayFontSize: true,
        displayTextAlignment: false,
    },
    headerFont: {
        type: ControlType.Font,
        title: "Section Title Font",
        controls: "extended",
        displayFontSize: true,
        displayTextAlignment: false,
    },
    titleFont: {
        type: ControlType.Font,
        title: "Event Title Font",
        controls: "extended",
        displayFontSize: true,
        displayTextAlignment: false,
    },
    bodyFont: {
        type: ControlType.Font,
        title: "Body Font",
        controls: "extended",
        displayFontSize: true,
        displayTextAlignment: false,
    },
    dateFont: {
        type: ControlType.Font,
        title: "Date Label Font",
        controls: "extended",
        displayFontSize: true,
        displayTextAlignment: false,
    },
    buttonFont: {
        type: ControlType.Font,
        title: "Button / Link Font",
        controls: "extended",
        displayFontSize: true,
        displayTextAlignment: false,
    },
    timeSuffix: {
        type: ControlType.String,
        title: "Time Suffix",
        defaultValue: "",
        placeholder: "e.g., PST, ET",
    },
    showDebug: {
        type: ControlType.Boolean,
        title: "Show Debug Info",
        defaultValue: false,
    },
})

EventList.displayName = "Event List"
