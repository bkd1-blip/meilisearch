// const getFeedQuery = `WITH ProfileImage AS (
//   SELECT DISTINCT ON (files_related_morphs.related_id)
//     files_related_morphs.related_id AS profileId,
//     files,
//     files.url -- Add the URL field here
//   FROM files_related_morphs
//   INNER JOIN (
//     SELECT
//       CASE WHEN f.formats IS NOT NULL
//            THEN json_build_object('thumbnail', (f.formats->>'thumbnail')::jsonb)
//            ELSE NULL END AS formats,
//       id, name, width, height, hash, ext, mime, size, url,
//       preview_url, provider, provider_metadata, folder_path,
//       created_at, updated_at
//     FROM files f
//   ) AS files ON files.id = files_related_morphs.file_id
//   WHERE files_related_morphs.related_type = 'api::profile.profile'
//     AND files_related_morphs.field = 'image'
// ),

// SubscriberData AS (
//   SELECT
//     s.id AS subscriber_id,
//     s.waitlist,
//     s.created_at,
//     s.updated_at,
//     s.published_at,
//     sp.username,
//     sp.first_name,
//     sp.last_name,
//     sp.display_name,
//     sp.wishes,
//     sp.private,
//     sel.event_id as event_id,
//     ProfileImage.files AS image_url
//   FROM subscribers s
//   LEFT JOIN subscribers_event_links sel ON sel.subscriber_id = s.id
//   LEFT JOIN subscribers_profile_links spl ON spl.subscriber_id = s.id
//   LEFT JOIN profiles sp ON sp.id = spl.profile_id
//   LEFT JOIN ProfileImage ON ProfileImage.profileId = sp.id
//   ORDER BY s.created_at DESC
//   LIMIT 10
// ),

// FeedCreator AS (
//   SELECT DISTINCT ON (feeds.id)
//     feeds.id AS feed_id,
//     profiles.id AS created_by_id,
//     profiles.private AS creatorPrivate,
//     json_build_object(
//       'id',          profiles.id,
//       'username',    profiles.username,
//       'firstName',   profiles.first_name,
//       'lastName',    profiles.last_name,
//       'displayName', profiles.display_name,
//       'wishes',      profiles.wishes,
//       'image',       ProfileImage.files,
//       'private',     profiles.private
//     ) AS creator
//   FROM feeds
//   INNER JOIN feeds_creator_links   ON feeds_creator_links.feed_id = feeds.id
//   INNER JOIN profiles              ON feeds_creator_links.profile_id = profiles.id
//   LEFT  JOIN ProfileImage          ON ProfileImage.profileId = profiles.id
// ),

// FeedFile AS (
//   SELECT DISTINCT ON (files_related_morphs.related_id)
//     files_related_morphs.related_id AS feed_id,
//     json_build_object('image', files) AS file
//   FROM files_related_morphs
//   INNER JOIN (
//     SELECT
//       CASE WHEN f.formats IS NOT NULL
//            THEN json_build_object('thumbnail', (f.formats->>'thumbnail')::jsonb)
//            ELSE NULL END AS formats,
//       id, name, width, height, hash, ext, mime, size, url,
//       preview_url, provider, provider_metadata, folder_path,
//       created_at, updated_at
//     FROM files f
//   ) AS files ON files.id = files_related_morphs.file_id
//   WHERE files_related_morphs.related_type = 'api::feed.feed'
//     AND files_related_morphs.field = 'file'
// ),

// FeedGroupFile AS (
//   SELECT DISTINCT ON (files_related_morphs.related_id)
//     files_related_morphs.related_id AS group_id,
//     files
//   FROM files_related_morphs
//   INNER JOIN (
//     SELECT
//       CASE WHEN f.formats IS NOT NULL
//            THEN json_build_object('thumbnail', (f.formats->>'thumbnail')::jsonb)
//            ELSE NULL END AS formats,
//       id, name, width, height, hash, ext, mime, size, url,
//       preview_url, provider, provider_metadata, folder_path,
//       created_at, updated_at
//     FROM files f
//   ) AS files ON files.id = files_related_morphs.file_id
//   WHERE files_related_morphs.related_type = 'api::group.group'
//     AND files_related_morphs.field  = 'urlImage'
// ),

// FeedGroup AS (
//   SELECT DISTINCT ON (feeds_group_links.feed_id)
//     feeds_group_links.feed_id AS feed_id,
//     json_build_object(
//       'id',           groups.id,
//       'displayName',  groups.display_name,
//       'extendedName', groups.extended_name,
//       'type',         groups."type",
//       'wishes',       groups.wishes,
//       'urlImage',     FeedGroupFile.files
//     ) AS "group",
//     groups.is_private AS group_is_private,
//     groups."type"     AS group_type
//   FROM feeds_group_links
//   INNER JOIN groups          ON feeds_group_links.group_id = groups.id
//   LEFT  JOIN FeedGroupFile   ON FeedGroupFile.group_id     = groups.id
// ),

// EventDetails AS (
//   SELECT
//     id as event_id,
//     date as event_date
//   FROM
//     events
// ),
// EventQuestionDetails AS (
//   SELECT
//     f.id AS feed_id,
//     f.type,
//     f.type_id,
//     q.id AS question_id,
//     qe.event_id,
//     e.date AS event_date
//   FROM
//     feeds f
//   LEFT JOIN
//     questions q ON f.type_id = q.id
//   LEFT JOIN
//     questions_event_links qe ON q.id = qe.question_id
//   LEFT JOIN
//     events e ON qe.event_id = e.id
//   WHERE
//     f.type = 'question'
// ),

// AllComments AS (
//   SELECT
//     f.id AS feed_id,
//     c.id AS comment_id,
//     c.description,
//     p.id AS profile_id,
//     p.first_name,
//     p.last_name,
//     p.display_name,
//     p.wishes,
//     c.created_at,
//     c.updated_at,
//     ProfileImage.url AS creator_image_url
//   FROM feeds f
//   LEFT JOIN comments_content_links ccl ON f.type = 'content' AND f.type_id = ccl.content_id
//   LEFT JOIN comments_thought_links ctl ON f.type = 'thought' AND f.type_id = ctl.thought_id
//   LEFT JOIN comments c ON c.id = COALESCE(ccl.comment_id, ctl.comment_id) AND c.hibernation = false
//   LEFT JOIN comments_creator_links ccre ON ccre.comment_id = c.id
//   LEFT JOIN profiles p ON p.id = ccre.profile_id
//   LEFT JOIN ProfileImage ON ProfileImage.profileId = p.id
//   WHERE c.id IS NOT NULL
// ),

// CommentsPerFeed AS (
//   SELECT
//     feed_id,
//     json_agg(comment_id ORDER BY comment_id DESC) AS comments
//   FROM AllComments
//   GROUP BY feed_id
// ),

// Last5CommentsPerFeed AS (
//   SELECT
//     feed_id,
//     json_agg(
//       json_build_object(
//         'id', comment_id,
//         'description', description,
//         'createdAt', created_at,
//         'updatedAt', updated_at,
//         'creator', json_build_object(
//           'displayName', first_name || ' ' || last_name,
//           'firstName', first_name,
//           'lastName', last_name
//         ),
//         'creatorImage', creator_image_url,
//         'message', description
//       ) ORDER BY created_at DESC
//     ) AS lastComments
//   FROM (
//     SELECT
//       feed_id,
//       comment_id,
//       created_at,
//       updated_at,
//       description,
//       profile_id,
//       first_name,
//       last_name,
//       creator_image_url,
//       ROW_NUMBER() OVER (PARTITION BY feed_id ORDER BY created_at DESC) AS row_num
//     FROM AllComments
//   ) AS ranked_comments
//   WHERE row_num <= 5
//   GROUP BY feed_id
// ),

// DistinctFeeds AS (
//   SELECT
//     feeds.id,
//     feeds.type,
//     feeds.type_id AS "typeId",
//     TO_CHAR(DATE_TRUNC('day', feeds.created_at), 'YYYY-MM-DD') AS "createdDay",
//     feeds.created_at AS "createdAt",
//     feeds.title,
//     feeds.subtitle,
//     feeds.body,
//     feeds.location,
//     feeds.event,
//     feeds.file_url AS "fileUrl",
//     FeedFile.file,
//     FeedCreator.creator,
//     FeedCreator.created_by_id,
//     CommentsPerFeed.comments AS comments,
//     COALESCE(Last5CommentsPerFeed.lastComments, '[]'::json) AS lastFiveComments, -- Ensure jsonb consistency
//     FeedGroup."group",
//     feeds.priority,
//     feeds.width,
//     feeds.height,
//     feeds.pinned,
//     FeedGroup.group_type,
//     FeedGroup.group_is_private,
//     feeds.description,
//     feeds.hibernation,
//     EventDetails.event_date,
//     EventQuestionDetails.question_id,
//     EventQuestionDetails.event_id AS question_event_id,
//     EventQuestionDetails.event_date AS question_event_date
//   FROM feeds
//   INNER JOIN FeedCreator ON feeds.id = FeedCreator.feed_id
//   LEFT JOIN FeedFile ON feeds.id = FeedFile.feed_id
//   LEFT JOIN FeedGroup ON feeds.id = FeedGroup.feed_id
//   LEFT JOIN CommentsPerFeed ON feeds.id = CommentsPerFeed.feed_id
//   LEFT JOIN Last5CommentsPerFeed ON feeds.id = Last5CommentsPerFeed.feed_id
//   LEFT JOIN EventDetails ON feeds.type_id = EventDetails.event_id
//   LEFT JOIN EventQuestionDetails ON feeds.id = EventQuestionDetails.feed_id
//   LEFT JOIN SubscriberData sd ON feeds.event = sd.event_id  -- Join with SubscriberData
//   ORDER BY pinned DESC, "createdAt" DESC
// )

// SELECT
//   id,
//   json_build_object(
//     'type', type,
//     'typeId', "typeId",
//     'title', title,
//     'subtitle', subtitle,
//     'body', body,
//     'location', location,
//     'fileUrl', "fileUrl",
//     'priority', priority,
//     'file', json_build_object('data', json_build_object('attributes', file)),
//     'creator', json_build_object(
//       'data', json_build_object(
//         'id', creator->>'id',
//         'attributes', json_build_object(
//           'username', creator->>'username',
//           'firstName', creator->>'firstName',
//           'lastName', creator->>'lastName',
//           'displayName', creator->>'displayName',
//           'wishes', creator->>'wishes',
//           'image', json_build_object(
//             'data', json_build_object(
//               'id', (creator->'image'->>'id')::text,
//               'attributes', json_build_object(
//                 'formats', creator->'image'->'formats',
//                 'name', (creator->'image'->>'name')::text,
//                 'width', (creator->'image'->>'width')::text,
//                 'height', (creator->'image'->>'height')::text,
//                 'hash', (creator->'image'->>'hash')::text,
//                 'size', (creator->'image'->>'size')::text,
//                 'url', (creator->'image'->>'url')::text
//               )
//             )
//           ),
//           'private', creator->>'private'
//         )
//       )
//     ),
//     'comments_by_user', comments,
//     'lastFiveComments', lastFiveComments, -- Ensures empty array if no comments
//     'event', event,
//     'group', json_build_object('data', json_build_object('attributes', "group")),
//     'createdAt', "createdAt",
//     'created_by', created_by_id,
//     'pinned', pinned,
//     'width', width,
//     'height', height,
//     'group_type', group_type,
//     'group_is_private', group_is_private,
//     'description', description,
//     'hibernation', hibernation,
//     'eventDate', event_date,
//     'question_id', question_id,
//     'question_event_id', question_event_id,
//     'question_event_date', question_event_date
//   ) AS attributes
// FROM DistinctFeeds;`;

const getFeedQuery = `WITH ProfileImage AS (
  SELECT DISTINCT ON (files_related_morphs.related_id)
    files_related_morphs.related_id AS profileId,
    files,
    files.url -- Add the URL field here
  FROM files_related_morphs
  INNER JOIN (
    SELECT
      CASE WHEN f.formats IS NOT NULL
           THEN json_build_object('thumbnail', (f.formats->>'thumbnail')::jsonb)
           ELSE NULL END AS formats,
      id, name, width, height, hash, ext, mime, size, url,
      preview_url, provider, provider_metadata, folder_path,
      created_at, updated_at
    FROM files f
  ) AS files ON files.id = files_related_morphs.file_id
  WHERE files_related_morphs.related_type = 'api::profile.profile'
    AND files_related_morphs.field = 'image'
),

SubscriberData AS (
  SELECT
    s.id AS subscriber_id,
    s.waitlist,
    s.created_at,
    s.updated_at,
    s.published_at,
    sp.username,
    sp.first_name,
    sp.last_name,
    sp.display_name,
    sp.wishes,
    sp.private,
    sel.event_id as event_id,
    ProfileImage.files AS image_url,
    ROW_NUMBER() OVER (PARTITION BY sel.event_id ORDER BY s.created_at DESC) AS rn
  FROM subscribers s
  LEFT JOIN subscribers_event_links sel ON sel.subscriber_id = s.id
  LEFT JOIN subscribers_profile_links spl ON spl.subscriber_id = s.id
  LEFT JOIN profiles sp ON sp.id = spl.profile_id
  LEFT JOIN ProfileImage ON ProfileImage.profileId = sp.id
),

AggregatedSubscribers AS (
  SELECT
    event_id,
    json_agg(
      json_build_object(
        'subscriber_id', subscriber_id,
        'waitlist', waitlist,
        'created_at', created_at,
        'updated_at', updated_at,
        'published_at', published_at,
        'username', username,
        'firstName', first_name,
        'lastName', last_name,
        'displayName', display_name,
        'wishes', wishes,
        'private', private,
        'image_url', image_url
      )
    ) AS firstTenSubscribers
  FROM SubscriberData
  WHERE rn <= 10 AND event_id IS NOT NULL
  GROUP BY event_id
),

FeedCreator AS (
  SELECT DISTINCT ON (feeds.id)
    feeds.id AS feed_id,
    profiles.id AS created_by_id,
    profiles.private AS creatorPrivate,
    json_build_object(
      'id',          profiles.id,
      'username',    profiles.username,
      'firstName',   profiles.first_name,
      'lastName',    profiles.last_name,
      'displayName', profiles.display_name,
      'wishes',      profiles.wishes,
      'image',       ProfileImage.files,
      'private',     profiles.private
    ) AS creator
  FROM feeds
  INNER JOIN feeds_creator_links   ON feeds_creator_links.feed_id = feeds.id
  INNER JOIN profiles              ON feeds_creator_links.profile_id = profiles.id
  LEFT  JOIN ProfileImage          ON ProfileImage.profileId = profiles.id
),

FeedFile AS (
  SELECT DISTINCT ON (files_related_morphs.related_id)
    files_related_morphs.related_id AS feed_id,
    json_build_object('image', files) AS file
  FROM files_related_morphs
  INNER JOIN (
    SELECT
      CASE WHEN f.formats IS NOT NULL
           THEN json_build_object('thumbnail', (f.formats->>'thumbnail')::jsonb)
           ELSE NULL END AS formats,
      id, name, width, height, hash, ext, mime, size, url,
      preview_url, provider, provider_metadata, folder_path,
      created_at, updated_at
    FROM files f
  ) AS files ON files.id = files_related_morphs.file_id
  WHERE files_related_morphs.related_type = 'api::feed.feed'
    AND files_related_morphs.field = 'file'
),

FeedGroupFile AS (
  SELECT DISTINCT ON (files_related_morphs.related_id)
    files_related_morphs.related_id AS group_id,
    files
  FROM files_related_morphs
  INNER JOIN (
    SELECT
      CASE WHEN f.formats IS NOT NULL
           THEN json_build_object('thumbnail', (f.formats->>'thumbnail')::jsonb)
           ELSE NULL END AS formats,
      id, name, width, height, hash, ext, mime, size, url,
      preview_url, provider, provider_metadata, folder_path,
      created_at, updated_at
    FROM files f
  ) AS files ON files.id = files_related_morphs.file_id
  WHERE files_related_morphs.related_type = 'api::group.group'
    AND files_related_morphs.field  = 'urlImage'
),

FeedGroup AS (
  SELECT DISTINCT ON (feeds_group_links.feed_id)
    feeds_group_links.feed_id AS feed_id,
    json_build_object(
      'id',           groups.id,
      'displayName',  groups.display_name,
      'extendedName', groups.extended_name,
      'type',         groups."type",
      'wishes',       groups.wishes,
      'urlImage',     FeedGroupFile.files
    ) AS "group",
    groups.is_private AS group_is_private,
    groups."type"     AS group_type
  FROM feeds_group_links
  INNER JOIN groups          ON feeds_group_links.group_id = groups.id
  LEFT  JOIN FeedGroupFile   ON FeedGroupFile.group_id     = groups.id
),

EventDetails AS (
  SELECT
    id as event_id,
    date as event_date
  FROM
    events
),

EventQuestionDetails AS (
  SELECT
    f.id AS feed_id,
    f.type,
    f.type_id,
    q.id AS question_id,
    qe.event_id,
    e.date AS event_date
  FROM
    feeds f
  LEFT JOIN
    questions q ON f.type_id = q.id
  LEFT JOIN
    questions_event_links qe ON q.id = qe.question_id
  LEFT JOIN
    events e ON qe.event_id = e.id
  WHERE
    f.type = 'question'
),

AllComments AS (
  SELECT
    f.id AS feed_id,
    c.id AS comment_id,
    c.description,
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.wishes,
    c.created_at,
    c.updated_at,
    ProfileImage.url AS creator_image_url
  FROM feeds f
  LEFT JOIN comments_content_links ccl ON f.type = 'content' AND f.type_id = ccl.content_id
  LEFT JOIN comments_thought_links ctl ON f.type = 'thought' AND f.type_id = ctl.thought_id
  LEFT JOIN comments c ON c.id = COALESCE(ccl.comment_id, ctl.comment_id) AND c.hibernation = false
  LEFT JOIN comments_creator_links ccre ON ccre.comment_id = c.id
  LEFT JOIN profiles p ON p.id = ccre.profile_id
  LEFT JOIN ProfileImage ON ProfileImage.profileId = p.id
  WHERE c.id IS NOT NULL
),

CommentsPerFeed AS (
  SELECT
    feed_id,
    json_agg(comment_id ORDER BY comment_id DESC) AS comments
  FROM AllComments
  GROUP BY feed_id
),

Last5CommentsPerFeed AS (
  SELECT
    feed_id,
    json_agg(
      json_build_object(
        'id', comment_id,
        'description', description,
        'createdAt', created_at,
        'updatedAt', updated_at,
        'creator', json_build_object(
          'displayName', first_name || ' ' || last_name,
          'firstName', first_name,
          'lastName', last_name
        ),
        'creatorImage', creator_image_url,
        'message', description
      ) ORDER BY created_at DESC
    ) AS lastComments
  FROM (
    SELECT
      feed_id,
      comment_id,
      created_at,
      updated_at,
      description,
      profile_id,
      first_name,
      last_name,
      creator_image_url,
      ROW_NUMBER() OVER (PARTITION BY feed_id ORDER BY created_at DESC) AS row_num
    FROM AllComments
  ) AS ranked_comments
  WHERE row_num <= 5
  GROUP BY feed_id
),

DistinctFeeds AS (
  SELECT
    feeds.id,
    feeds.type,
    feeds.type_id AS "typeId",
    TO_CHAR(DATE_TRUNC('day', feeds.created_at), 'YYYY-MM-DD') AS "createdDay",
    feeds.created_at AS "createdAt",
    feeds.title,
    feeds.subtitle,
    feeds.body,
    feeds.location,
    feeds.event,
    feeds.file_url AS "fileUrl",
    FeedFile.file,
    FeedCreator.creator,
    FeedCreator.created_by_id,
    CommentsPerFeed.comments AS comments,
    COALESCE(Last5CommentsPerFeed.lastComments, '[]'::json) AS lastFiveComments, -- Ensure jsonb consistency
    FeedGroup."group",
    feeds.priority,
    feeds.width,
    feeds.height,
    feeds.pinned,
    FeedGroup.group_type,
    FeedGroup.group_is_private,
    feeds.description,
    feeds.hibernation,
    EventDetails.event_date,
    EventQuestionDetails.question_id,
    EventQuestionDetails.event_id AS question_event_id,
    EventQuestionDetails.event_date AS question_event_date,
    AggregatedSubscribers.firstTenSubscribers
  FROM feeds
  INNER JOIN FeedCreator ON feeds.id = FeedCreator.feed_id
  LEFT JOIN FeedFile ON feeds.id = FeedFile.feed_id
  LEFT JOIN FeedGroup ON feeds.id = FeedGroup.feed_id
  LEFT JOIN CommentsPerFeed ON feeds.id = CommentsPerFeed.feed_id
  LEFT JOIN Last5CommentsPerFeed ON feeds.id = Last5CommentsPerFeed.feed_id
  LEFT JOIN EventDetails ON feeds.type_id = EventDetails.event_id
  LEFT JOIN EventQuestionDetails ON feeds.id = EventQuestionDetails.feed_id
  LEFT JOIN AggregatedSubscribers ON AggregatedSubscribers.event_id = feeds.event
  ORDER BY pinned DESC, "createdAt" DESC
)

SELECT
  id,
  json_build_object(
    'type', type,
    'typeId', "typeId",
    'title', title,
    'subtitle', subtitle,
    'body', body,
    'location', location,
    'fileUrl', "fileUrl",
    'priority', priority,
    'file', json_build_object('data', json_build_object('attributes', file)),
    'creator', json_build_object(
      'data', json_build_object(
        'id', creator->>'id',
        'attributes', json_build_object(
          'username', creator->>'username',
          'firstName', creator->>'firstName',
          'lastName', creator->>'lastName',
          'displayName', creator->>'displayName',
          'wishes', creator->>'wishes',
          'image', json_build_object(
            'data', json_build_object(
              'id', (creator->'image'->>'id')::text,
              'attributes', json_build_object(
                'formats', creator->'image'->'formats',
                'name', (creator->'image'->>'name')::text,
                'width', (creator->'image'->>'width')::text,
                'height', (creator->'image'->>'height')::text,
                'hash', (creator->'image'->>'hash')::text,
                'size', (creator->'image'->>'size')::text,
                'url', (creator->'image'->>'url')::text
              )
            )
          ),
          'private', creator->>'private'
        )
      )
    ),
    'comments_by_user', comments,
    'lastFiveComments', lastFiveComments, -- Ensures empty array if no comments
    'event', event,
    'group', json_build_object('data', json_build_object('attributes', "group")),
    'createdAt', "createdAt",
    'created_by', created_by_id,
    'pinned', pinned,
    'width', width,
    'height', height,
    'group_type', group_type,
    'group_is_private', group_is_private,
    'description', description,
    'hibernation', hibernation,
    'eventDate', event_date,
    'question_id', question_id,
    'question_event_id', question_event_id,
    'question_event_date', question_event_date,
    'firstTenSubscribers', COALESCE(firstTenSubscribers, '[]'::json)
  ) AS attributes
FROM DistinctFeeds;`;

const getUserQuery = `WITH ProfileImage AS (
  SELECT DISTINCT ON  (files_related_morphs.related_id)
        files_related_morphs.related_id AS profileId,
        files
  FROM
        files_related_morphs
  INNER JOIN
         (SELECT CASE WHEN f.formats IS NOT NULL THEN json_build_object(
            'large', (f.formats->>'large')::jsonb,
            'medium', (f.formats->>'medium')::jsonb,
            'small', (f.formats->>'small')::jsonb,
            'thumbnail', (f.formats->>'thumbnail')::jsonb
        ) ELSE NULL END formats, id, name, width, height, hash, ext, mime, size, url, preview_url, provider, provider_metadata, folder_path, created_at, updated_at  
         FROM files f) AS files ON files.id = files_related_morphs.file_id 
  WHERE files_related_morphs.related_type = 'api::profile.profile' 
    AND files_related_morphs.field = 'image'
),
DistinctProfilesWithoutConnections AS (
  SELECT
    profiles.id,
    profiles.username,
    profiles.first_name,
    profiles.last_name,
    profiles.display_name,
    profiles.created_at,
    profiles.slug,
    to_json(ProfileImage.files) AS image,
    ROW_NUMBER() OVER (PARTITION BY profiles.created_at ORDER BY profiles.created_at DESC) AS rn
  FROM
    profiles
  LEFT JOIN
    ProfileImage ON profiles.id = ProfileImage.profileId
  INNER JOIN
    profiles_reduser_links ON profiles_reduser_links.profile_id = profiles.id
  INNER JOIN
    redusers ON profiles_reduser_links.reduser_id = redusers.id
  WHERE
    redusers.status = 'MEMBER'
    AND redusers.register_step = 'finish'
    AND NOT EXISTS (
      SELECT 1
      FROM profile_connections
      INNER JOIN profile_connections_sender_links ON profile_connections.id = profile_connections_sender_links.profile_connection_id
      INNER JOIN profile_connections_receiver_links ON profile_connections.id = profile_connections_receiver_links.profile_connection_id
      WHERE
        profile_connections_sender_links.profile_id = profiles.id
        AND profile_connections_receiver_links.profile_id = profiles.id
        AND profile_connections.status = 'approved'
      LIMIT 1
    )
)
SELECT
  id,
  username,
  first_name AS "firstName",
  last_name AS "lastName",
  display_name AS "displayName",
  slug,
  created_at AS "createdAt",
  image
FROM
  DistinctProfilesWithoutConnections
WHERE
  rn = 1
ORDER BY
  created_at DESC;`;

module.exports = { getFeedQuery, getUserQuery };
