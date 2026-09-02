"use client";

import { useState } from "react";

import {
  Accordion,
  Box,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CheckboxGroup,
  DataTable,
  Details,
  Field,
  Grid,
  HeaderBar,
  InsetText,
  Input,
  Message,
  Pagination,
  ProgressBar,
  RadioGroup,
  ScoutsHeading,
  ScoutsHeader,
  ScoutsList,
  ScoutsLink,
  SectionHeading,
  Select,
  SideNav,
  SortableList,
  Spinner,
  Stepper,
  SummaryList,
  Tag,
  Tabs,
  TaskList,
  Textarea,
  Timeline,
} from "@/components/ui";

const SWATCHES = [
  ["purple", "#7413dc"],
  ["teal", "#088486"],
  ["navy", "#003982"],
  ["blue", "#006ddf"],
  ["forest", "#205b41"],
  ["green", "#25b755"],
  ["orange", "#ff912a"],
  ["yellow", "#ffe627"],
  ["pink", "#ffb4e5"],
  ["red", "#ed3f23"],
] as const;

const SECTIONS = [
  { id: "overview", label: "Overview", href: "#foundations", variant: "purple" as const },
  { id: "navigation", label: "Navigation", href: "#navigation", variant: "teal" as const, count: 5 },
  { id: "feedback", label: "Feedback", href: "#feedback", variant: "orange" as const, count: 4 },
  { id: "data", label: "Data display", href: "#data", variant: "green" as const },
  { id: "forms", label: "Forms", href: "#forms", variant: "blue" as const },
];

const TABLE_ROWS = [
  { section: "Beavers", meets: "Mondays", members: 18 },
  { section: "Cubs", meets: "Wednesdays", members: 24 },
  { section: "Scouts", meets: "Fridays", members: 30 },
];

export function ComponentLibraryShowcase() {
  const [step, setStep] = useState(0);
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState(["flag-break", "wide-game", "badge-work"]);

  return (
    <main className="min-h-screen bg-white text-black">
      <ScoutsHeader
        title="QR Hunt component library"
        subtitle="Scouts-inspired building blocks for the player and admin experiences."
      />
      <HeaderBar level={1}>
        <nav aria-label="Component sections" className="mx-auto flex max-w-6xl gap-6 overflow-x-auto">
          {SECTIONS.map((item) => (
            <ScoutsLink key={item.id} href={item.href} variant="text" className="shrink-0 text-white">
              {item.label}
            </ScoutsLink>
          ))}
        </nav>
      </HeaderBar>
      <Stepper
        steps={[
          { id: "details", label: "Your details" },
          { id: "section", label: "Choose a section" },
          { id: "confirm", label: "Confirm" },
        ]}
        currentStep={step}
        onStepChange={setStep}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "UI" },
            { label: "Component library" },
          ]}
        />

        <div className="mt-8 space-y-16">
          <section id="foundations" aria-labelledby="foundations-title">
            <SectionHeading
              title="Foundations"
              description="Brand colours, typography, buttons, tags and layout primitives are the base layer for every QR Hunt surface."
            />
            <Grid columns={2}>
              <Card>
                <CardHeader title="Headings" description="Use a single page heading, then step down through the scale." />
                <CardBody className="space-y-3">
                  <ScoutsHeading size="xl">Extra large heading</ScoutsHeading>
                  <ScoutsHeading size="l">Large heading</ScoutsHeading>
                  <ScoutsHeading size="m">Medium heading</ScoutsHeading>
                  <ScoutsHeading size="s">Small heading</ScoutsHeading>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Buttons" description="Six semantic variants, five sizes and an outline treatment." />
                <CardBody className="flex flex-wrap gap-3">
                  {(["primary", "secondary", "success", "info", "warning", "danger"] as const).map((variant) => (
                    <Button key={variant} variant={variant} size="sm">
                      {variant}
                    </Button>
                  ))}
                  <Button variant="primary" outline size="sm">
                    Outline
                  </Button>
                  <Button variant="ghost" size="sm">
                    Quiet action
                  </Button>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Tags" description="Use short labels for statuses, sections and route metadata." />
                <CardBody className="flex flex-wrap gap-2">
                  <Tag variant="primary">Route</Tag>
                  <Tag variant="teal">Live</Tag>
                  <Tag variant="success">Complete</Tag>
                  <Tag variant="warning">Paused</Tag>
                  <Tag variant="danger">Needs attention</Tag>
                  <Tag variant="cubs">Cubs</Tag>
                  <Tag variant="beavers">Beavers</Tag>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Colour tokens" description="The palette maps directly to Tailwind utilities and CSS variables." />
                <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {SWATCHES.map(([name, hex]) => (
                    <div key={name} className="border border-black">
                      <div className="h-12" style={{ backgroundColor: hex }} />
                      <div className="p-2 text-sm font-bold capitalize">{name}</div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </Grid>
          </section>

          <section id="navigation" aria-labelledby="navigation-title">
            <SectionHeading
              title="Navigation"
              description="Patterns for moving through a join flow, a game dashboard or a route editor."
            />
            <Grid columns={2}>
              <Card>
                <CardHeader title="Button group" description="A compact filter control with optional counts." />
                <CardBody className="space-y-4">
                  <ButtonGroup
                    ariaLabel="Filter by route status"
                    value={filter}
                    onChange={setFilter}
                    items={[
                      { id: "all", label: "All", count: 8 },
                      { id: "needs-check", label: "Needs check", count: 2 },
                      { id: "complete", label: "Complete", count: 6 },
                    ]}
                  />
                  <p className="text-sm text-scouts-grey-dark">
                    Selected: <code className="font-bold text-black">{filter}</code>
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Tabs" description="Keep related content in one context without adding another route." />
                <CardBody>
                  <Tabs
                    items={[
                      { id: "beavers", label: "Beavers", content: <p>Beavers are aged 6 to 8 and love games and adventures.</p> },
                      { id: "cubs", label: "Cubs", content: <p>Cubs are aged 8 to 10 and earn badges as they explore.</p> },
                      { id: "scouts", label: "Scouts", content: <p>Scouts are aged 10 to 14 and take on bigger challenges.</p> },
                    ]}
                    defaultValue="cubs"
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Side navigation" description="An accent edge and count make the current area obvious." />
                <CardBody>
                  <SideNav items={SECTIONS} activeId="navigation" />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Box and list" description="Useful for short guidance, onboarding steps and player instructions." />
                <CardBody className="space-y-4">
                  <Box variant="navy" size="sm">Download the route before leaving the start.</Box>
                  <ScoutsList
                    ordered
                    spaced
                    items={["Find the next poster", "Scan or enter its code", "Follow the new hint"]}
                  />
                </CardBody>
              </Card>
            </Grid>
          </section>

          <section id="feedback" aria-labelledby="feedback-title">
            <SectionHeading
              title="Feedback and state"
              description="Make game status, validation, loading and progress clear at a glance."
            />
            <Grid columns={2}>
              <Card>
                <CardHeader title="Messages" description="Use the semantic variant that matches the user action." />
                <CardBody className="space-y-3">
                  <Message title="Game started" variant="success">Your team can now follow the route.</Message>
                  <Message title="Game paused" variant="warning">Scanning is paused. Check back when the leader restarts the game.</Message>
                  <Message title="Connection issue" variant="danger" dismissible>We saved your scan locally and will retry when you are online.</Message>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Progress" description="The same component supports player route progress and admin summaries." />
                <CardBody className="space-y-5">
                  <ProgressBar value={60} label="3 of 5 stops" labelPosition="above" />
                  <ProgressBar value={65} variant="success" label="65% complete" labelPosition="inside" />
                  <ProgressBar value={30} variant="navy" size="sm" label="Syncing scans" labelPosition="below" />
                  <Spinner label="Checking for updates" inline size="sm" />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Inset and details" description="Use inset text for important context and details for optional explanations." />
                <CardBody className="space-y-4">
                  <InsetText>Keep the complete route bundle on the device before going offline.</InsetText>
                  <Details summary="How is offline progress handled?">
                    <p>Scans are queued on the device and reconciled against the server route order when connectivity returns.</p>
                  </Details>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Status badge" description="Existing QR Hunt statuses use the shared Scouts palette." />
                <CardBody className="flex flex-wrap gap-2">
                  <Tag variant="grey">Draft</Tag>
                  <Tag variant="info">Published</Tag>
                  <Tag variant="success">Started</Tag>
                  <Tag variant="warning">Paused</Tag>
                  <Tag variant="purple">Finished</Tag>
                </CardBody>
              </Card>
            </Grid>
          </section>

          <section id="data" aria-labelledby="data-title">
            <SectionHeading
              title="Data display"
              description="Shared shapes for dashboards, route editors, activity feeds and player summaries."
            />
            <Grid columns={2}>
              <Card>
                <CardHeader title="Summary list" description="A compact label and value layout for game metadata." />
                <CardBody>
                  <SummaryList
                    items={[
                      { label: "Game", value: "Forest Signals", action: <ScoutsLink href="#data">Change</ScoutsLink> },
                      { label: "Stops", value: "12 checkpoints" },
                      { label: "Starts", value: "Saturday at 10:00" },
                    ]}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Table" description="Tables stay readable on small screens with horizontal scrolling." />
                <CardBody>
                  <DataTable
                    caption="Section meeting times"
                    columns={[
                      { key: "section", header: "Section" },
                      { key: "meets", header: "Meets" },
                      { key: "members", header: "Members", numeric: true },
                    ]}
                    rows={TABLE_ROWS}
                    getRowKey={(row) => row.section}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Timeline" description="Useful for scan history, game events and admin activity." />
                <CardBody>
                  <Timeline
                    items={[
                      { id: "received", title: "Game created", date: "09:40", byline: "Alex", description: "Forest Signals was created.", variant: "info" },
                      { id: "started", title: "Game started", date: "10:00", byline: "Alex", description: "Teams can now scan route codes.", variant: "success" },
                      { id: "paused", title: "Game paused", date: "10:42", byline: "Alex", description: "The leader paused the game for a regroup.", variant: "warning" },
                    ]}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Task list" description="A status row works well for setup checklists and route readiness." />
                <CardBody>
                  <TaskList
                    items={[
                      { id: "profile", name: "Create game", status: "complete", statusLabel: "Complete", href: "#data" },
                      { id: "route", name: "Add route stops", status: "in-progress", statusLabel: "In progress", href: "#data", hint: "Add names, hints and locations." },
                      { id: "posters", name: "Print poster set", status: "not-started", statusLabel: "Not started" },
                    ]}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Accordion" description="Progressive disclosure for route guidance and admin configuration." />
                <CardBody>
                  <Accordion
                    defaultOpen={["cubs"]}
                    items={[
                      { id: "squirrels", title: "Squirrels", summary: "Ages 4 to 6", content: <p>Short routes and simple hints help younger players take part.</p> },
                      { id: "cubs", title: "Cubs", summary: "Ages 6 to 8", content: <p>Cubs can solve a clue together before scanning the next stop.</p> },
                      { id: "scouts", title: "Scouts", summary: "Ages 10 to 14", content: <p>Scouts can take on longer routes with more independent navigation.</p> },
                    ]}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Sortable list" description="Keyboard controls and drag targets support route ordering." />
                <CardBody className="space-y-4">
                  <SortableList
                    items={[
                      { id: "flag-break", title: "Flag break", description: "5 minutes" },
                      { id: "wide-game", title: "Wide game", description: "30 minutes" },
                      { id: "badge-work", title: "Badge work", description: "40 minutes" },
                    ]}
                    onReorder={(items) => setSortOrder(items.map((item) => item.id))}
                  />
                  <p className="text-sm text-scouts-grey-dark">
                    Order: <code className="text-black">{sortOrder.join(", ")}</code>
                  </p>
                </CardBody>
              </Card>
            </Grid>
            <div className="mt-5">
              <Pagination currentPage={3} totalPages={8} hrefForPage={(page) => `#data?page=${page}`} />
            </div>
          </section>

          <section id="forms" aria-labelledby="forms-title">
            <SectionHeading
              title="Forms"
              description="Inputs share a strong focus state, clear labels and space for validation guidance."
            />
            <Grid columns={2}>
              <Card>
                <CardHeader title="Text controls" description="Compose Field with any native control or custom input." />
                <CardBody className="space-y-5">
                  <Field label="Game name" htmlFor="showcase-game-name" hint="Keep it recognisable for leaders and players." required>
                    <Input id="showcase-game-name" defaultValue="Forest Signals" />
                  </Field>
                  <Field label="Pause message" htmlFor="showcase-pause-message">
                    <Textarea id="showcase-pause-message" defaultValue="Come back to the start when the game resumes." />
                  </Field>
                  <Field label="County" htmlFor="showcase-county">
                    <Select id="showcase-county" defaultValue="">
                      <option value="">Please select</option>
                      <option value="london">Greater London</option>
                      <option value="yorkshire">West Yorkshire</option>
                    </Select>
                  </Field>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Choices" description="Use native radio and checkbox semantics with a consistent layout." />
                <CardBody className="space-y-7">
                  <RadioGroup
                    name="showcase-mode"
                    legend="Game mode"
                    defaultValue="speed"
                    options={[
                      { value: "speed", label: "Speed", hint: "Rank teams by route pace." },
                      { value: "explore", label: "Explore", hint: "Let teams enjoy the route without a race." },
                    ]}
                  />
                  <CheckboxGroup
                    name="showcase-settings"
                    legend="Player options"
                    defaultValue={["names"]}
                    options={[
                      { value: "names", label: "Let teams choose names" },
                      { value: "photos", label: "Let teams upload photos" },
                      { value: "offline", label: "Allow offline route downloads" },
                    ]}
                  />
                </CardBody>
              </Card>
            </Grid>
          </section>
        </div>
      </div>
    </main>
  );
}
