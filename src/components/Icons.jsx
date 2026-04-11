const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const Check = (props) => (
  <svg {...svgProps} {...props}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const Droplet = (props) => (
  <svg {...svgProps} {...props}>
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const Shield = (props) => (
  <svg {...svgProps} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const File = (props) => (
  <svg {...svgProps} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const Globe = (props) => (
  <svg {...svgProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const Monitor = (props) => (
  <svg {...svgProps} {...props}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
  </svg>
);

const Alert = (props) => (
  <svg {...svgProps} {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const Clock = (props) => (
  <svg {...svgProps} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const Box = (props) => (
  <svg {...svgProps} {...props}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.29 7L12 12l8.71-5" />
    <path d="M12 22V12" />
  </svg>
);

const Star = (props) => (
  <svg {...svgProps} {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const Share = (props) => (
  <svg {...svgProps} {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98" />
    <path d="M15.41 6.51L8.59 10.49" />
  </svg>
);

const Search = (props) => (
  <svg {...svgProps} {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const Spark = (props) => (
  <svg {...svgProps} {...props}>
    <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" />
    <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
  </svg>
);

const Baby = (props) => (
  <svg {...svgProps} {...props}>
    <circle cx="12" cy="8" r="3" />
    <path d="M7 21v-3a5 5 0 0 1 10 0v3" />
    <path d="M9 4l1-2h4l1 2" />
  </svg>
);

export const icons = {
  check: Check,
  droplet: Droplet,
  shield: Shield,
  file: File,
  globe: Globe,
  monitor: Monitor,
  alert: Alert,
  clock: Clock,
  box: Box,
  star: Star,
  share: Share,
  search: Search,
  spark: Spark,
  baby: Baby,
};

export function Icon({ name, ...rest }) {
  const Component = icons[name];
  if (!Component) return null;
  return <Component {...rest} />;
}
