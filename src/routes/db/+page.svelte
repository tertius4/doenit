<script>
    import db from "$domain/db";
    
    let tasks = $state(await db.task.findMany());
    let categories = $state(await db.category.findMany());
    let permissions = $state(await db.permissions.findMany());
    let settings = $state(await db.settings.findMany());
    let user = $state(await db.user.findMany());
    let session = $state(await db.session.get());
</script>

<pre>{JSON.stringify({ tasks, categories, permissions, settings, user, session }, null, 2)}</pre>